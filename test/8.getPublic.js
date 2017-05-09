var expect = require('chai').expect;

var dto = require('./init');

describe('Run [getPublic] tests', function() {
	it('Check default getPublic structure', function(done) {
		dto.User.get({
			id: 1
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			users = users.getPublic();

			expect(users[0]).to.have.property('id', 1);
			expect(users[0]).to.not.have.property('created');
			expect(users[0]).to.have.property('name', 'Alex');
			expect(users[0]).to.have.property('email', 'alex@server.com');
			expect(users[0]).to.not.have.property('hpassword');
			expect(users[0]).to.not.have.property('password');
			expect(users[0]).to.not.have.property('post_count_cache');
			expect(users[0]).to.not.have.property('comments_count');

			done();
		});
	});

	it('Check getPublic admin structure', function(done) {
		dto.User.get({
			id: 1
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			users = users.getPublic('admin');

			expect(users[0]).to.not.have.property('id');
			expect(users[0]).to.not.have.property('created');
			expect(users[0]).to.have.property('name', 'Alex');
			expect(users[0]).to.have.property('email', 'alex@server.com');
			expect(users[0]).to.not.have.property('hpassword');
			expect(users[0]).to.not.have.property('password');
			expect(users[0]).to.not.have.property('post_count_cache');
			expect(users[0]).to.not.have.property('comments_count');

			done();
		});		
	});

	it('Check getPublic lite structure', function(done) {
		dto.User.get({
			id: 1
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			users = users.getPublic('lite');

			expect(users[0]).to.not.have.property('id');
			expect(users[0]).to.not.have.property('created');
			expect(users[0]).to.have.property('name', 'Alex');
			expect(users[0]).to.not.have.property('email');
			expect(users[0]).to.not.have.property('hpassword');
			expect(users[0]).to.not.have.property('password');
			expect(users[0]).to.not.have.property('post_count_cache');
			expect(users[0]).to.not.have.property('comments_count');

			done();
		});		
	});

	it('Check getPublic for calling with multiple schemas', function(done) {
		dto.User.get({
			id: 1
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			users = users.getPublic(['lite', 'admin']);

			expect(users[0]).to.not.have.property('id');
			expect(users[0]).to.not.have.property('created');
			expect(users[0]).to.have.property('name', 'Alex');
			expect(users[0]).to.have.property('email');
			expect(users[0]).to.not.have.property('hpassword');
			expect(users[0]).to.not.have.property('password');
			expect(users[0]).to.not.have.property('post_count_cache');
			expect(users[0]).to.not.have.property('comments_count');

			done();
		});		
	});


});