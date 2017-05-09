var expect = require('chai').expect;

var dto = require('./init');

describe('Run [INSERT] tests', function() {
	it('Check success insert', function(done) {
		var user = dto.User.create({
			name: 'Test_User',
			email: 'insert@server.com',
			password: '123'
		});

		user.save(function(err, user) {
			expect(err).to.not.exist;
			expect(user).to.exist;

			expect(user).to.have.property('id');
			expect(user.id).to.be.a('number');

			expect(user).to.have.property('name', 'Test_User');
			expect(user).to.have.property('email', 'insert@server.com');
			expect(user).to.have.property('password', '123');
			expect(user).to.have.property('hpassword', 'insert@server.com123');
			expect(user).to.have.property('post_count_cache', 0);

			done();
		});
	});

	it('Check fail insert', function(done) {
		var user = dto.User.create({
			created: 'not_date_string'
		});

		user.save(function(err, user) {
			expect(err).to.exist;
			expect(user).to.exist;

			done();
		});
	});
});