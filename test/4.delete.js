var expect = require('chai').expect;

var dto = require('./init');

describe('Run [DELETE] tests', function() {
	it('Check success delete', function(done) {
		var user = dto.User.create({
			name: 'Test_User',
			email: 'delete.success@server.com',
			password: '123'
		});

		user.save(function(err, user) {

			user.delete(function(err) {
				expect(err).to.not.exist;

				done();
			});
		});
	});

	it('Check success delete', function(done) {
		var user = dto.User.create({
			name: 'Test_User',
			email: 'delete.success@server.com',
			password: '123'
		});

		user.save(function(err, user) {

			user.delete(function(err) {
				expect(err).to.not.exist;

				done();
			});
		});
	});


});