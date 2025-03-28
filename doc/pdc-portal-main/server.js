var debug = require('debug')('portal:server');
const config = require('./config.js');
const moment = require('moment');
const uuid = require('uuid');
const fetch = require('node-fetch');
const jose = require('node-jose');
var jwt = require('jsonwebtoken').decode;
var bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const favicon = require('serve-favicon');
const express = require('express');
const { info } = require('console');
const request = require('request');
const qr = require('qrcode')
const session = require('express-session');
const app = express();
const NodeCache = require("node-cache");


app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
	genid: function (req) {
		return crypto.randomBytes(16).toString('hex')
	},
	secret: crypto.randomBytes(16).toString('hex'),
	// 5 min
	cookie: {
		maxAge: 5 * 60 * 1000
	}

}))

// Global variables
global.portal_jwt = null;
global.user_idp = null;

//Capability Token store
global.CTStore = new Map();

const tokenCache = new NodeCache();

// Prepare CRT
const crt_regex = /^-----BEGIN CERTIFICATE-----\n([\s\S]+?)\n-----END CERTIFICATE-----$/gm;
const chain = [];
let m;
while ((m = crt_regex.exec(config.crt)) !== null) {
	// This is necessary to avoid infinite loops with zero-width matches
	if (m.index === crt_regex.lastIndex) {
		crt_regex.lastIndex++;
	}
	chain.push(m[1].replace(/\n/g, ""));
}
debug('Prepared certificate chain: %o', chain);

// Create JWT
async function create_jwt(payload) {
	debug('Creating signed JWT for payload: %j', payload);
	const key = await jose.JWK.asKey(config.key, "pem");
	return await jose.JWS.createSign({
		algorithm: 'RS256',
		format: 'compact',
		fields: {
			typ: "JWT",
			x5c: chain
		}
	}, key).update(JSON.stringify(payload)).final();
}

// Send /authorise
async function authorise(idp) {
	debug('Perform /authorise for IDP: %j', idp);
	let result = {
		location: null,
		err: null
	};
	const now = moment();
	const iat = now.unix();
	const exp = now.add(30, 'seconds').unix();
	const token = await create_jwt({
		jti: uuid.v4(),
		iss: config.id,
		sub: config.id,
		aud: [
			idp.id,
			idp.token_endpoint
		],
		iat,
		nbf: iat,
		exp,
		response_type: "code",
		client_id: config.id,
		scope: "openid iSHARE sub name contact_details",
		redirect_uri: config.redirect_uri,
		state: "af0ifjsldkj",
		nonce: "c428224ca5a",
		acr_values: config.acr_values,
		language: "en"
	});
	portal_jwt = token;

	const params = new URLSearchParams();
	params.append('response_type', 'code');
	params.append('client_id', config.id);
	params.append('scope', 'iSHARE openid');
	params.append('request', token);


	try {
		debug('Sending /authorise request to IDP with URL encoded body: %o', params);
		const validation_response = await fetch(idp.authorize_endpoint, {
			method: 'POST',
			body: params,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
		});
		if (validation_response.status != 204 || !validation_response.headers.has('location')) {
			debug('Invalid response on /authorise: %j', validation_response);
			result.err = JSON.stringify(validation_response);
		} else {
			debug('Received location header: %o', validation_response.headers.get('location'));
			result.location = idp.url + validation_response.headers.get('location');
		}
		return result;
	} catch (e) {
		debug('Error: %o', e);
		result.err = e;
		return result;
	}

}

// Send /token
async function requestToken(code, jwt, idp) {
	debug('Request /token at IDP');
	let result = {
		access_token: null,
		err: null
	};
	const tparams = new URLSearchParams();
	tparams.append('grant_type', 'authorization_code');
	tparams.append('client_id', config.id);
	tparams.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
	tparams.append('client_assertion', jwt);
	tparams.append('redirect_uri', config.redirect_uri);
	tparams.append('code', code);

	try {
		debug('Sending request to /token endpoint of IDP with URL encoded params: %o', tparams);
		const token_response = await fetch(idp.token_endpoint, {
			method: 'POST',
			body: tparams
		});
		if (token_response.status != 200) {
			debug('Request not successful: %j', token_response);
			result.err = JSON.stringify(token_response);
			return result;
		}

		const res_body = await token_response.json();
		if (!res_body) {
			result.err = "Missing JSON response body";
		} else if (!res_body['access_token']) {
			result.err = "Missing access_token in response body";
		} else {
			debug('Received access token: %o', res_body['access_token']);
			result.access_token = res_body['access_token'];
		}
		return result;
	} catch (e) {
		result.err = e;
		return result;
	}

}

//Function for getting a CapabilityToken for accessing a resource 
async function fetchCapabilityToken(action, id, req_session) {
	const response = await fetch('http://peppdp-service/api/connector-access-token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			didSP: "Leo-Free-Home-Standing-1 Hand-Phone",
			sar: { action: action, resource: id },
			didRequester: "df429e49-23e1-4013-9962-091602afdd83",
			accessToken: req_session.access_token
		})
	});

	if (!response.ok) {
		throw new Error("Failed to fetch Capability Token: " + response.statusText);
	}

	const capabilityToken = await response.json();
	return capabilityToken;
}

//Function for accessing the resource using a CapabilityToken
async function useCapabilityToken(capabilityToken, action, id, query_params, json_body) {

	//GET doesn't have a json_body field
	if (action == "GET") {
		requestBody=null;
		if (query_params == null) {
			requestBody = {
				ct: capabilityToken,  // Capability Token received
				sar: {
					action: action,
					resource: id
				}
			};
		} else {
			requestBody = {
				ct: capabilityToken,  // Capability Token received
				sar: {
					action: action,
					resource: id
				},
				queryParameters: JSON.parse(query_params)
			};
		}
		const secondResponse = await fetch('http://peppdp-service/api/access-with-token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		if (!secondResponse.ok) {
			info("Failed to fetch from second API: " + secondResponse.statusText);
			return null;
		}

		const secondData = await secondResponse.text();
		info("Response from the second API: " + secondData);
		return secondData;

	} else {	//POST needs the json_body field 
		const requestBody = {
			ct: capabilityToken,  // Capability Token received
			sar: {
				action: action,
				resource: id
			},
			queryParameters: JSON.parse(query_params),
			jsonBody: JSON.parse(json_body)
		};
		console.log(JSON.parse(json_body));
		const secondResponse = await fetch('http://peppdp-service/api/access-with-token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		if (!secondResponse.ok) {
			info("Failed to fetch from second API: " + secondResponse.statusText);
			return null;
		}

		const secondData = await secondResponse.text();
		info("Response from the second API: " + secondData);
		return secondData;
	}
}

// Function for updating a resource 
async function get_delivery(delivery_id, query_params, json_body, req_session) {

	let result = {
		err: null,
		json_body: null,
		delivery: null
	}

	info("Connecting to PEP-PDP Service...");

	// Check if capability tokens map is empty
	if (CTStore.size === 0) {
		console.log("First Capability Token issued");
		const firstData = await fetchCapabilityToken("POST", delivery_id, req_session);

		//Store Capability Token issued in the map

		//Create map key - [action, resource, jwt, na] 
		let ar = firstData.ar;
		let action, resource;
		if (Array.isArray(ar) && ar.length > 0) {
			action = ar[0].action;
			resource = ar[0].resource;
			console.log("Action:", action);
			console.log("Resource:", resource);
		}

		let jwt_requester = req_session.access_token;
		console.log(jwt_requester);

		//value - [CapabilityToken]
		let na = firstData.na;
		console.log(na);

		let key = {
			action: action,
			resource: resource,
			accessToken: jwt_requester,
			na: na
		};

		//Store new CapabilityToken in the map
		CTStore.set(key, firstData);
		for (let [key, value] of CTStore) {
			console.log(`Key: ${key}, Value: ${value}`);
		}


		const secondData = await useCapabilityToken(firstData, "POST", delivery_id, query_params, json_body);

		result.delivery = secondData;
		return result;

	} else {
		console.log("There are Capability Tokens stored, checking if the requester possess one of them...");
		let found = false;
		let capabilityToken = null;
		CTStore.forEach((value, key) => {
			let currentTime = Date.now();

			// Check if the key matches the requester's information
			if (key.action === "POST" && key.resource === delivery_id && key.accessToken === req_session.access_token && key.na >= currentTime) {
				found = true;
				console.log("Found Capability Token available for the requester");

				capabilityToken = value;
				console.log("Capability Token used:", capabilityToken);
			}
		});
		if (found) {
			const secondData = await useCapabilityToken(capabilityToken, "POST", delivery_id, query_params, json_body);
			result.delivery = secondData;
			return result;

		} else {
			console.log("The Map doesn't contain a Capability Token for that requester, issuing a new Capability Token...");
			// Request the resource 
			const firstData = await fetchCapabilityToken("POST", delivery_id, req_session);

			//Store Capability Token in the map

			//key - [action, resource, jwt, na] 
			let ar = firstData.ar;
			let action, resource;
			if (Array.isArray(ar) && ar.length > 0) {
				action = ar[0].action;
				resource = ar[0].resource;
				console.log("Action:", action);
				console.log("Resource:", resource);
			}

			let jwt_requester = req_session.access_token;
			console.log(jwt_requester);

			//value - [expiration]
			let na = firstData.na;
			console.log(na);

			let key = {
				action: action,
				resource: resource,
				accessToken: jwt_requester,
				na: na
			};

			CTStore.set(key, firstData);
			for (let [key, value] of CTStore) {
				console.log(`Clave: ${key}, Valor: ${value}`);
			}

			const secondData = await useCapabilityToken(firstData, "POST", delivery_id, query_params, json_body);

			result.delivery = secondData;
			return result;

		}

	}
}


//GET 
async function get_entities(type, query_params_get, req_session) {
	let result = {
		err: null,
		query_params_get: null,
		entities: null
	}
	info("Connecting to PEP-PDP Service...");
	info("Json Body to deliver to the resource: " + query_params_get);
	// Check if capability tokens map is empty
	if (CTStore.size === 0) {
		console.log("First Capability Token issued");
		// Request the resource 
		const firstData = await fetchCapabilityToken("GET", type, req_session);

		//Store Capability Token in the map

		//key - [action, resource, jwt, na] 
		let ar = firstData.ar;
		let action, resource;
		if (Array.isArray(ar) && ar.length > 0) {
			action = ar[0].action;
			resource = ar[0].resource;
			console.log("Action:", action);
			console.log("Resource:", resource);
		}

		let jwt_requester = req_session.access_token;
		console.log(jwt_requester);

		//value - [expiration]
		let na = firstData.na;
		console.log(na);

		let key = {
			action: action,
			resource: resource,
			accessToken: jwt_requester,
			na: na
		};

		CTStore.set(key, firstData);
		for (let [key, value] of CTStore) {
			console.log(`Clave: ${key}, Valor: ${value}`);
		}

		// Request the access with the Capability Token
		if (query_params_get == "") {
			const secondData = await useCapabilityToken(firstData, "GET", type, null, null);
			result.entities = secondData;
			return result;
		} else {

			const secondData = await useCapabilityToken(firstData, "GET",type, query_params_get, null);
			result.entities = secondData;
			return result;
		}
	} else {
		console.log("There are Capability Tokens stored, checking if the requester possess one of them...");
		let found = false;
		let capabilityToken = null;
		CTStore.forEach((value, key) => {
			let currentTime = Date.now();
			// Check if the key matches the requester's information
			if (key.action === "GET" && key.resource === type && key.accessToken === req_session.access_token && key.na >= currentTime) {
				found = true;
				console.log("Found Capability Token available for the requester");

				capabilityToken = value;
				console.log("Capability Token used:", capabilityToken);
			}
		});
		if (found) {
			// Request the access with the Capability Token
			if (query_params_get == "") {
				const secondData = await useCapabilityToken(capabilityToken, "GET", type, null, null);
				result.entities = secondData;
				return result;
			} else {
				const secondData = await useCapabilityToken(capabilityToken, "GET",type, query_params_get, null);
				result.entities = secondData;
				return result;
			}
		} else {
			console.log("The Map doesn't contain a Capability Token for that requester, issuing a new Capability Token...");
			// Request the resource 
			const firstData = await fetchCapabilityToken("GET", type, req_session);
			//Store Capability Token in the map

			//key - [action, resource, jwt, na] 
			let ar = firstData.ar;
			let action, resource;
			if (Array.isArray(ar) && ar.length > 0) {
				action = ar[0].action;
				resource = ar[0].resource;
				console.log("Action:", action);
				console.log("Resource:", resource);
			}

			let jwt_requester = req_session.access_token;
			console.log(jwt_requester);

			//value - [expiration]
			let na = firstData.na;
			console.log(na);

			let key = {
				action: action,
				resource: resource,
				accessToken: jwt_requester,
				na: na
			};

			CTStore.set(key, firstData);
			for (let [key, value] of CTStore) {
				console.log(`Clave: ${key}, Valor: ${value}`);
			}

			// Request the access with the Capability Token
			if (query_params_get == "") {
				const secondData = await useCapabilityToken(firstData, "GET", type, null, null);
				result.entities = secondData;
				return result;
			} else {
				const secondData = await useCapabilityToken(firstData, "GET", type, query_params_get, null);
				result.entities = secondData;
				return result;
			}
		}
	}
}

async function register_sd(sd, req_session) {
	let result = {
		err: null,
		status: null
	}
	const trustedIssuerEntity = {
		type: "TrustedIssuer",
		id: "urn:ngsi-ld:TrustedIssuer:" + sd.id,
		issuer: {
			type: "Property",
			value: sd.id
		},
		selfDescription: {
			type: "Property",
			value: sd
		}
	}
	var path = req_session.cb_endpoint + '/entities';
	var url = new URL(path);
	try {
		info("Register trusted issuer: " + JSON.stringify(trustedIssuerEntity))
		const post_response = await fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': 'Bearer ' + req_session.access_token,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(trustedIssuerEntity)
		});
		if (post_response.status != 201) {
			const errorBody = await post_response.text();
			result.err = `Failed to register issuer: ${post_response.status} - ${errorBody}`;
			info('Failed to register issuer: ${post_response.status} - ${errorBody}');
			return result;
		}
		debug('Successfully registered issuer');
		result.status = post_response.status;
		return result;
	} catch (e) {
		result.err = e;
		return result;
	}
}

// PATCH change delivery attribute
async function patch_delivery(id, attr, val, req_session) {
	let result = {
		err: null,
		status: null
	}
	var path = req_session.cb_endpoint + '/entities/' + id + '/attrs/' + attr;
	var url = new URL(path);
	const body = {
		type: "Property",
		value: val
	};

	try {
		debug('Perform PATCH request: Change ' + attr + ' to ' + val + ' for ' + id);
		debug('PATCH request URL: %o', url);
		debug('PATCH request body: %j', body);
		const patch_response = await fetch(url, {
			method: 'PATCH',
			headers: {
				'Authorization': 'Bearer ' + req_session.access_token,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});
		if (patch_response.status != 204) {
			const errorBody = await patch_response.text();
			result.err = `Access denied when patching delivery order: ${errorBody}`;
			debug('Received error when patching delivery order: %o', errorBody);
			return result;
		}
		debug('PATCH successful');
		result.status = patch_response.status;
		return result;
	} catch (e) {
		result.err = e;
		return result;
	}

}

// Render error page
function render_error(res, user, error) {
	return res.render('error', {
		title: config.title,
		user: user,
		error: error
	});
}

async function evaluate_selfdescription(req_session) {
	info("Evaluate session");

	if (req_session.access_token) {
		info("The token " + req_session.access_token);
		var decoded = jwt(req_session.access_token);
		if (decoded['verifiablePresentation']) {
			info("Evaluate vp " + JSON.stringify(decoded['verifiablePresentation']));
			for (const vp of decoded['verifiablePresentation']) {
				info("Evaluate vc in vp " + JSON.stringify(vp));
				if (vp['credentialSubject']['type'] === "gx:LegalParticipant") {
					info("The subject " + JSON.stringify(vp['credentialSubject']));
					return vp['credentialSubject'];
				}
			}
		}
	}

	info("No sd");
	return null;
}

// Obtain email parameter from JWT access_token of user
async function evaluate_user(req_session) {
	info("Evaluate session")
	if (req_session.access_token) {
		info("The token " + req_session.access_token)
		var decoded = jwt(req_session.access_token)
		if (decoded['email']) {
			info("EMAIL")
			// plain oidc
			return decoded['email']
		} else if (decoded['verifiableCredential']) {
			info("VC")
			// we have a vc
			return decoded['verifiableCredential']['credentialSubject']['firstName'] + " " + decoded['verifiableCredential']['credentialSubject']['familyName']
		} else if (decoded['verifiablePresentation']) {
			info("VP")
			// we have a gaia-x credential
			for (const vp of decoded['verifiablePresentation']) {
				info("Evaluate" + vp)
				if (vp['credentialSubject']['firstName'] && vp['credentialSubject']['familyName']) {
					return vp['credentialSubject']['firstName'] + " " + vp['credentialSubject']['familyName']
				}
			}
		}
		info(JSON.stringify(decoded))
	}
	info("No token")
	return null;
}


async function getAccessToken(req_session, res, authCode) {
	var formAttributes = {
		'code': authCode,
		'grant_type': 'authorization_code',
		'redirect_uri': config.url + '/auth_callback'
	}
	var formBody = [];
	for (var property in formAttributes) {
		var encodedKey = encodeURIComponent(property);
		var encodedValue = encodeURIComponent(formAttributes[property]);
		formBody.push(encodedKey + "=" + encodedValue);
	}
	formBody = formBody.join("&");
	var req = {
		uri: config.siop.verifier_uri + config.siop.token_path,
		body: formBody,
		method: "POST",
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	}
	request(req, function (error, response) {
		if (!error && response.statusCode == 200) {
			req_session.session.access_token = JSON.parse(response.body)['access_token']
			req_session.session.cb_endpoint = config.cb_endpoint_siop
			info("Successfully received the access token")
			res.send('logged_in')
		} else {
			info("Failed to access.")
			if (!error) {
				info("Response code " + response.statusCode)
			} else {
				info("Error " + error)
			}
			res.send('error')
		}
	});

}

/*
  Routes
*/

// Main page
//
app.get('/', (req, res) => {
	debug('GET /: Call to main page');
	res.render('index', {
		title: config.title,
		idps: config.idp,
		siop: config.siop.enabled,
		siopJwtOnly: config.siop.jwtOnlyEnabled
	});
});

// /login
// Perform login by authorising and redirecting to login page of IDP
app.get('/login', async (req, res) => {
	debug('GET /login: Login requested');
	const idp = req.query.idp;
	const idp_config = config.idp.find(item => { return item.id == idp });
	user_idp = idp_config;
	const result = await authorise(idp_config);
	if (result.err) {
		render_error(res, null, '/authorise: ' + result.err)
	} else if (result.location) {
		debug('Perform redirect to: %o', result.location);
		res.redirect(result.location)
	} else {
		render_error(res, user, 'Failed authorisation')
	}
});

// Perform login via VC SIOP flow
app.get('/loginSiop', async (req, res) => {

	var showJwtOnly = false;
	if (req.query.jwtOnly && req.query.jwtOnly == "true") {
		showJwtOnly = true;
	}

	res.render("siop", {
		title: config.title,
		qr: "src",
		sessionId: req.sessionID,
		clientId: config.siop.clientId,
		siop_login: config.siop.verifier_uri + config.siop.login_path,
		siop_callback: encodeURIComponent(config.url + "/auth_callback"),
		jwtOnly: showJwtOnly
	});

});

app.get('/poll', async (req, res) => {
	if (Date.now() > req.session.cookie.expires) {
		res.send('expired')
	}
	info('Poll VC');
	token = tokenCache.get(req.sessionID)
	if (token == undefined) {
		info("No token for" + req.sessionID)
		res.send('pending')
	} else {
		tokenCache.del(req.sessionID)
		info("token " + token)
		getAccessToken(req, res, token)
	}
});

// /redirect
// Redirect endpoint for code flow
app.get(config.redirect_uri_path, async (req, res) => {
	debug('Receiving call to callback endpoint: %o', config.redirect_uri_path);
	if (!req.query || !req.query.code) {
		render_error(res, user, 'Did not receive authorisation code!')
	} else {
		const code = req.query.code;
		const result = await requestToken(code, portal_jwt, user_idp);
		if (result.err) {
			render_error(res, null, '/token: ' + result.err)
			return;
		} else if (result.access_token) {
			req.session.access_token = result.access_token;
			req.session.cb_endpoint = config.cb_endpoint;
			debug('Login succeeded, redirecting to /portal');
			res.redirect('/portal');
		} else {
			render_error(res, null, 'Failed retrieving token')
			return;
		}
	}

});

// /logout
// Perform logout: Delete user token and redirect to main page
app.get('/logout', (req, res) => {
	req.session.access_token = null;
	req.session.destroy();
	res.redirect('/');
})

// GET /portal
// Display portal start page after login
app.get('/portal', async (req, res) => {
	info('GET /portal: Call to portal page');
	var user = await evaluate_user(req.session);
	var sd = await evaluate_selfdescription(req.session);
	if (!user) {
		info('User was not logged in');
		render_error(res, null, 'Not logged in');
		return;
	}
	let trusted_issuers = []
	if (sd) {
		info("Got " + JSON.stringify(sd))
		trusted_issuers_result = await get_entities("TrustedIssuer", req.session)
		if (!trusted_issuers_result.err) {
			for (let i = 0; i < trusted_issuers_result.entities.length; i++) {
				trusted_issuers.push(trusted_issuers_result.entities[i].selfDescription.value)
			}
		}
	}

	res.render('portal', {
		title: config.title,
		entity_id: '',
		json_body: '',
		user: user,
		sd: sd,
		trusted_participants: trusted_issuers,
		get_label: config.getLabel,
		input_label: config.inputLabel
	});
});

// GET /jwt
// Display the JWT access token
app.get('/jwt', async (req, res) => {
	info('GET /jwt: Call to page displaying current JWT access token');
	var user = await evaluate_user(req.session);
	if (!user) {
		info('User was not logged in');
		render_error(res, null, 'Not logged in');
		return;
	}

	const access_token = req.session.access_token;

	res.render('jwt', {
		title: config.title,
		user: user,
		access_token: access_token
	});

});

app.post('/sd', async (req, res) => {
	info('Try to post self-description.')
	// just for rendering
	var user = await evaluate_user(req.session);
	// the sd to be registerd
	var sd = await evaluate_selfdescription(req.session)
	if (!sd) {
		console.warn('Session does not conatin a self description.');
		render_error(res, null, 'Not logged in');
		return;
	}

	const result = await register_sd(sd, req.session)

	let trusted_issuers = []

	trusted_issuers_result = await get_entities("TrustedIssuer", req.session)
	if (!trusted_issuers_result.err) {
		for (let i = 0; i < trusted_issuers_result.entities.length; i++) {
			trusted_issuers.push(trusted_issuers_result.entities[i].selfDescription.value)
		}
	}


	if (result.err) {
		res.render('portal', {
			title: config.title,
			entity_id: '',
			json_body: '',
			user: user,
			sd: sd,
			registered: false,
			error: result.err,
			trusted_participants: trusted_issuers,
			get_label: config.getLabel,
			input_label: config.inputLabel
		});
		return
	} else {
		res.render('portal', {
			title: config.title,
			entity_id: '',
			json_body: '',
			user: user,
			sd: sd,
			registered: true,
			trusted_participants: trusted_issuers,
			get_label: config.getLabel,
			input_label: config.inputLabel
		});
		return
	}
})

// POST /portal
// View/change  delivery order
app.post('/portal', async (req, res) => {
	info('POST /portal: Updating portal page');
	var user = await evaluate_user(req.session);
	if (!user) {
		debug('User was not logged in');
		render_error(res, null, 'Not logged in');
		return;
	}

	const entity_id = req.body.entity_id;
	const json_body = req.body.json_body;
	const query_params = req.body.query_params;
	const entity_type = req.body.entity_type;
	const query_params_get = req.body.query_params_get;
	info("entity_type " + entity_type)
	if (entity_type) {
		const result = await get_entities(entity_type, query_params_get, req.session)
		if (result.err) {
			render_error(res, user, 'Failure retrieving entities: ' + result.err)
			return;
		}
		info("entities get: " + result.entities);
		res.render('portal', {
			title: config.title,
			user: user,
			entities: result.entities,
			get_label: config.getLabel,
			input_label: config.inputLabel
		});
		return
	} else {
		// Change attribute first if requested
		if (req.body.entity_change_attr) {
			const change_attr = req.body.entity_change_attr;
			const change_val = req.body.entity_change_val;
			const patch_result = await patch_delivery(entity_id, change_attr, change_val, req.session);
			if (patch_result.err) {
				render_error(res, user, 'Failure patching entity: ' + patch_result.err)
				return;
			}
		}

		// Get attributes of delivery ID
		const result = await get_delivery(entity_id, query_params, json_body, req.session)
		if (result.err) {
			render_error(res, user, 'Failure retrieving entity order: ' + result.err)
			return;
		}

		info("entities posted: " + result.delivery);
		var entity = null;
		var entity_attributes = [];

		if (result.delivery) {
			entity = result.delivery;

		}

		try {
			let entityString = result.delivery;

			// Usar una expresión regular para extraer el bloque JSON si es necesario
			let jsonMatch = entityString.match(/\{[\s\S]*\}/);

			if (jsonMatch) {
				entity = JSON.parse(jsonMatch[0]); // Parsear el JSON
			} else {
				throw new Error('No JSON found in response');
			}

		} catch (error) {
			console.error('Error parsing JSON:', error);
		}

		if (entity) {
			// Convertir el objeto a una cadena JSON con formato
			entity_string = JSON.stringify(entity, null, 2);
		}

		if (result.delivery) {
			entity = result.delivery;
			entity_keys = Object.keys(entity);
			for (var key in entity_keys) {
				let attribute = {
					attribute_name: key,
					attribute_value: entity[key]
				}
			}
			entity_attributes = Object.entries(entity)
		}
		debug('Render portal page for delivery order: %o', entity_id);
		debug('Entity: %o', entity);

		res.render('portal', {
			title: config.title,
			user: user,
			delivery_id: entity_id,
			delivery: entity,
			entity_attributes: entity_attributes,
			get_label: config.getLabel,
			input_label: config.inputLabel
		});
	}
});

// /health
// Healthcheck endpoint
app.get('/health', (req, res) => {
	res.send({
		uptime: process.uptime(),
		message: 'OK',
		timestamp: Date.now()
	});
})

app.get('/auth_callback', (req, res) => {
	let state = req.query.state
	let code = req.query.code

	tokenCache.set(state, code)
	res.send('ok')
	info("Got state " + state + " and code " + code)

})



// Start server
//
const server = app.listen(config.port, () => {
	console.log(`Express running → PORT ${server.address().port}`);
});

