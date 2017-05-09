var expect = require('chai').expect;

var dto = require('./init');

describe('Run [CREATE] tests', function() {
	it('Check default jorm obect structure', function() {
		var user = dto.User.create({
			name: 'Test_User',
			email: 'create@server.com',
			password: '123'
		});

		expect(user).to.have.property('name', 'Test_User');
		expect(user).to.have.property('email', 'create@server.com');
		expect(user).to.have.property('password', '123');
		expect(user).to.have.property('hpassword', 'create@server.com123');
		expect(user).to.have.property('post_count_cache');
		expect(user).to.have.property('_meta');
		expect(user).to.have.deep.property('_meta.name', 'User');
		expect(user).to.have.deep.property('_meta.pk', 'id');

		expect(user).to.respondTo('save');
		expect(user).to.respondTo('delete');
		expect(user).to.respondTo('getPublic');
	});

	it('Check default jorm obect structure for demand fields', function() {
		var user = dto.User.create({
			name: 'Test_User',
			comments_count: 0
		});

		expect(user).to.have.property('name', 'Test_User');
		expect(user).to.have.property('comments_count');

		expect(user).to.respondTo('save');
		expect(user).to.respondTo('delete');
		expect(user).to.respondTo('getPublic');
	});
});