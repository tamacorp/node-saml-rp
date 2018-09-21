const saml2 = require('saml2-js');
const fs = require('fs');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: true
}));

// Create Relying Party (RP)
var rp_options = {
  entity_id: "http://localhost:3000/metadata.xml",
  private_key: fs.readFileSync("./certs/private.key").toString(),
  certificate: fs.readFileSync("./certs/public.crt").toString(),
  require_session_index: false,
  allowed_unencrypted_assettion: true,
  nameid_format: "urn:oasis:names:tc:SAML:2.0:nameid-format:unspeficied",
  assert_endpoint: "http://localhost:3000/assert"
};
var rp = new saml2.ServiceProvider(rp_options);

// Config Identity Provider (IDP)
var idp_options = {
  sso_login_url: "https://sso.tamacorp.co/saml",
  sso_logout_url: "https://sso.tamacorp.co/saml",
  require_session_index: false,
  certificates: [fs.readFileSync("./certs/tama.crt").toString()]
};
var idp = new saml2.IdentityProvider(idp_options);

// ------ Define express endpoints ------

// Endpoint to retrieve metadata
app.get("/metadata.xml", function(req, res) {
  res.type('application/xml');
  res.send(rp.create_metadata());
});

// Assert endpoint for when login completes
app.post("/assert", function(req, res) {
  var options = {request_body: req.body, require_session_index: false, allow_unencrypted_assertion: true};
  console.log(req.body)
  rp.post_assert(idp, options, function(err, saml_response) {
    console.log(err)
    if (err != null)
      return res.send(500);

    // Save name_id and session_index for logout
    // Note:  In practice these should be saved in the user session, not globally.
    name_id = saml_response.user.name_id;
    session_index = saml_response.user.session_index;
    console.log(saml_response.user)

    res.send("Hello " + saml_response.user.name_id + " !");
  });
});

// Starting point for login
app.get("/login", function(req, res) {
  rp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
    if (err != null)
      return res.send(500);
    res.redirect(login_url);
  });
});

// Starting point for logout
app.get("/logout", function(req, res) {
  var options = {
    name_id: name_id,
    session_index: session_index
  };

  rp.create_logout_request_url(idp, options, function(err, logout_url) {
    if (err != null)
      return res.send(500);
    res.redirect(logout_url);
  });
});

app.listen(3000);
console.log("RP is running on port 3000")

