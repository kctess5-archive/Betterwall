'use strict';

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.set('X-Auth-Required', 'true');
  req.session.returnUrl = req.originalUrl;
  res.redirect('/login/');
}

function ensureAdmin(req, res, next) {
  if (req.user.canPlayRoleOf('admin')) {
    return next();
  }
  res.redirect('');
}

function ensureAccount(req, res, next) {
  if (req.user.canPlayRoleOf('account')) {
    if (req.app.get('require-account-verification')) {
      if (req.user.roles.account.isVerified !== 'yes' && !/^\/account\/verification\//.test(req.url)) {
        return res.redirect('/account/verification/');
      }
    }
    return next();
  }
  res.redirect('/');
}

var routes = require('./routes/views.js'),
    about = require('./routes/about.js'),
    account = require('./routes/account.js'),
    admin = require('./routes/admin.js'),
    contact = require('./routes/contact.js'),
    httpErr = require('./routes/http.js'), //weird name to prevent namespace collision
    login = require('./routes/login.js'),
    logout = require('./routes/logout.js'),
    signup = require('./routes/signup.js');

var loginReset = require('./routes/login/reset.js'),
    loginForgot = require('./routes/login/forgot.js'),
    adminAccounts = require('./routes/admin/accounts.js'),
    adminAdminGroups = require('./routes/admin/admin-groups.js'),
    adminAdministrators = require('./routes/admin/administrators.js'),
    adminCategories = require('./routes/admin/categories.js'),
    adminSearch = require('./routes/admin/search.js'),
    adminStatuses = require('./routes/admin/statuses.js'),
    adminUsers = require('./routes/admin/users.js'),
    accountSettings = require('./routes/account/settings.js'),
    accountVerification = require('./routes/account/verification.js');


exports = module.exports = function(app, passport) {
  //front end
  app.get('/', routes.init);
  app.get('/about/', about.init);
  app.get('/contact/', contact.init);
  app.post('/contact/', contact.sendMessage);

  //sign up
  app.get('/signup/', signup.init);
  app.post('/signup/', signup.signup);

  //social sign up
  app.post('/signup/social/', signup.signupSocial);
  app.get('/signup/twitter/', passport.authenticate('twitter', { callbackURL: '/signup/twitter/callback/' }));
  app.get('/signup/twitter/callback/', signup.signupTwitter);
  app.get('/signup/github/', passport.authenticate('github', { callbackURL: '/signup/github/callback/', scope: ['user:email'] }));
  app.get('/signup/github/callback/', signup.signupGitHub);
  app.get('/signup/facebook/', passport.authenticate('facebook', { callbackURL: '/signup/facebook/callback/', scope: ['email'] }));
  app.get('/signup/facebook/callback/', signup.signupFacebook);
  app.get('/signup/google/', passport.authenticate('google', { callbackURL: '/signup/google/callback/', scope: ['profile email'] }));
  app.get('/signup/google/callback/', signup.signupGoogle);

  //login/out
  app.get('/login/', login.init);
  app.post('/login/', login.login);
  app.get('/login/forgot/', loginForgot.init);
  app.post('/login/forgot/', loginForgot.send);
  app.get('/login/reset/', loginReset.init);
  app.get('/login/reset/:email/:token/', loginReset.init);
  app.put('/login/reset/:email/:token/', loginReset.set);
  app.get('/logout/', logout.init);


  // app.get('/login/forgot/', require('./views/login/forgot/index').init);
  // app.post('/login/forgot/', require('./views/login/forgot/index').send);
  // app.get('/login/reset/', require('./views/login/reset/index').init);
  // app.get('/login/reset/:email/:token/', require('./views/login/reset/index').init);
  // app.put('/login/reset/:email/:token/', require('./views/login/reset/index').set);

  //social login
  app.get('/login/twitter/', passport.authenticate('twitter', { callbackURL: '/login/twitter/callback/' }));
  app.get('/login/twitter/callback/', login.loginTwitter);
  app.get('/login/github/', passport.authenticate('github', { callbackURL: '/login/github/callback/' }));
  app.get('/login/github/callback/', login.loginGitHub);
  app.get('/login/facebook/', passport.authenticate('facebook', { callbackURL: '/login/facebook/callback/' }));
  app.get('/login/facebook/callback/', login.loginFacebook);
  app.get('/login/google/', passport.authenticate('google', { callbackURL: '/login/google/callback/', scope: ['profile email'] }));
  app.get('/login/google/callback/', login.loginGoogle);

  //admin
  app.all('/admin*', ensureAuthenticated);
  app.all('/admin*', ensureAdmin);
  app.get('/admin/', admin.init);

  //admin > users
  app.get('/admin/users/', adminUsers.find);
  app.post('/admin/users/', adminUsers.create);
  app.get('/admin/users/:id/', adminUsers.read);
  app.put('/admin/users/:id/', adminUsers.update);
  app.put('/admin/users/:id/password/', adminUsers.password);
  app.put('/admin/users/:id/role-admin/', adminUsers.linkAdmin);
  app.delete('/admin/users/:id/role-admin/', adminUsers.unlinkAdmin);
  app.put('/admin/users/:id/role-account/', adminUsers.linkAccount);
  app.delete('/admin/users/:id/role-account/', adminUsers.unlinkAccount);
  app.delete('/admin/users/:id/', adminUsers.delete);

  //admin > administrators
  app.get('/admin/administrators/', adminAdministrators.find);
  app.post('/admin/administrators/', adminAdministrators.create);
  app.get('/admin/administrators/:id/', adminAdministrators.read);
  app.put('/admin/administrators/:id/', adminAdministrators.update);
  app.put('/admin/administrators/:id/permissions/', adminAdministrators.permissions);
  app.put('/admin/administrators/:id/groups/', adminAdministrators.groups);
  app.put('/admin/administrators/:id/user/', adminAdministrators.linkUser);
  app.delete('/admin/administrators/:id/user/', adminAdministrators.unlinkUser);
  app.delete('/admin/administrators/:id/', adminAdministrators.delete);

  //admin > admin groups
  app.get('/admin/admin-groups/', adminAdminGroups.find);
  app.post('/admin/admin-groups/', adminAdminGroups.create);
  app.get('/admin/admin-groups/:id/', adminAdminGroups.read);
  app.put('/admin/admin-groups/:id/', adminAdminGroups.update);
  app.put('/admin/admin-groups/:id/permissions/', adminAdminGroups.permissions);
  app.delete('/admin/admin-groups/:id/', adminAdminGroups.delete);

  //admin > accounts
  app.get('/admin/accounts/', adminAccounts.find);
  app.post('/admin/accounts/', adminAccounts.create);
  app.get('/admin/accounts/:id/', adminAccounts.read);
  app.put('/admin/accounts/:id/', adminAccounts.update);
  app.put('/admin/accounts/:id/user/', adminAccounts.linkUser);
  app.delete('/admin/accounts/:id/user/', adminAccounts.unlinkUser);
  app.post('/admin/accounts/:id/notes/', adminAccounts.newNote);
  app.post('/admin/accounts/:id/status/', adminAccounts.newStatus);
  app.delete('/admin/accounts/:id/', adminAccounts.delete);

  //admin > statuses
  app.get('/admin/statuses/', adminStatuses.find);
  app.post('/admin/statuses/', adminStatuses.create);
  app.get('/admin/statuses/:id/', adminStatuses.read);
  app.put('/admin/statuses/:id/', adminStatuses.update);
  app.delete('/admin/statuses/:id/', adminStatuses.delete);

  //admin > categories
  app.get('/admin/categories/', adminCategories.find);
  app.post('/admin/categories/', adminCategories.create);
  app.get('/admin/categories/:id/', adminCategories.read);
  app.put('/admin/categories/:id/', adminCategories.update);
  app.delete('/admin/categories/:id/', adminCategories.delete);

  //admin > search
  app.get('/admin/search/', adminSearch.find);

  //account
  app.all('/account*', ensureAuthenticated);
  app.all('/account*', ensureAccount);
  app.get('/account/', account.init);

  //account > verification
  app.get('/account/verification/', accountVerification.init);
  app.post('/account/verification/', accountVerification.resendVerification);
  app.get('/account/verification/:token/', accountVerification.verify);

  //account > settings
  app.get('/account/settings/', accountSettings.init);
  app.put('/account/settings/', accountSettings.update);
  app.put('/account/settings/identity/', accountSettings.identity);
  app.put('/account/settings/password/', accountSettings.password);

  //account > settings > social
  app.get('/account/settings/twitter/', passport.authenticate('twitter', { callbackURL: '/account/settings/twitter/callback/' }));
  app.get('/account/settings/twitter/callback/', accountSettings.connectTwitter);
  app.get('/account/settings/twitter/disconnect/', accountSettings.disconnectTwitter);
  app.get('/account/settings/github/', passport.authenticate('github', { callbackURL: '/account/settings/github/callback/' }));
  app.get('/account/settings/github/callback/', accountSettings.connectGitHub);
  app.get('/account/settings/github/disconnect/', accountSettings.disconnectGitHub);
  app.get('/account/settings/facebook/', passport.authenticate('facebook', { callbackURL: '/account/settings/facebook/callback/' }));
  app.get('/account/settings/facebook/callback/', accountSettings.connectFacebook);
  app.get('/account/settings/facebook/disconnect/', accountSettings.disconnectFacebook);
  app.get('/account/settings/google/', passport.authenticate('google', { callbackURL: '/account/settings/google/callback/', scope: ['profile email'] }));
  app.get('/account/settings/google/callback/', accountSettings.connectGoogle);
  app.get('/account/settings/google/disconnect/', accountSettings.disconnectGoogle);

  //route not found
  app.all('*', httpErr.http404);
};













