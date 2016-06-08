var expect = require('chai').expect

var dto = require('./init');

describe("Run [SELECT] tests", function() {
	it('Check select by one field ==', function(done) {
		dto.User.get({ id: 1 }, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			var user = users[0];
			expect(user).to.have.property('id', 1);
			expect(user).to.have.property('name', 'Alex');
			expect(user).to.have.property('email', 'alex@server.com');
			expect(user).to.have.property('hpassword', 'qweqwe');
			expect(user).to.have.property('post_count_cache', 2);

			done();
		});
	});

	it('Check select by two fields ==', function(done) {
		dto.User.get({ 
			id: 1, 
			name: 'Alex' 
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			var user = users[0];
			expect(user).to.have.property('id', 1);
			expect(user).to.have.property('name', 'Alex');
			expect(user).to.have.property('email', 'alex@server.com');
			expect(user).to.have.property('hpassword', 'qweqwe');
			expect(user).to.have.property('post_count_cache', 2);

			done();
		});
	});

	it('Check select by custom comparsion LIKE', function(done) {
		dto.User.get({ 
			id: 1,
			name: {comparsion: 'LIKE', value: '%lex%'}
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			var user = users[0];
			expect(user).to.have.property('id', 1);
			expect(user).to.have.property('name', 'Alex');
			expect(user).to.have.property('email', 'alex@server.com');
			expect(user).to.have.property('hpassword', 'qweqwe');
			expect(user).to.have.property('post_count_cache', 2);

			done();
		});
	});

	it('Check select by custom comparsion < and custom columns', function(done) {
		dto.User.get({ 
			id: 1,
			no_matters: {columns: ['post_count_cache'], comparsion: '<', value: 10}
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			var user = users[0];
			expect(user).to.have.property('id', 1);
			expect(user).to.have.property('name', 'Alex');
			expect(user).to.have.property('email', 'alex@server.com');
			expect(user).to.have.property('hpassword', 'qweqwe');
			expect(user).to.have.property('post_count_cache', 2);

			done();
		});
	});

	it('Check select by two columns and custom comparsion', function(done) {
		dto.User.get({ 
			any_field: {columns:['name', 'email'], comparsion: 'like', value: '%lex'}
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			var user = users[0];
			expect(user).to.have.property('id', 1);
			expect(user).to.have.property('name', 'Alex');
			expect(user).to.have.property('email', 'alex@server.com');
			expect(user).to.have.property('hpassword', 'qweqwe');
			expect(user).to.have.property('post_count_cache', 2);

			done();
		});
	});

	it('Check select two comparsion by one field', function(done) {
		dto.User.get({ 
			id: 1,
			no_matters1: {columns: ['post_count_cache'], comparsion: '>', value: 0},
			no_matters2: {columns: ['post_count_cache'], comparsion: '<', value: 10}
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			var user = users[0];
			expect(user).to.have.property('id', 1);
			expect(user).to.have.property('name', 'Alex');
			expect(user).to.have.property('email', 'alex@server.com');
			expect(user).to.have.property('hpassword', 'qweqwe');
			expect(user).to.have.property('post_count_cache', 2);

			done();
		});
	});

	it('Check select IN clause with OR IS NULL clause', function(done) {
		dto.User.get({ 
			name: 'Alex',
			id: [1,2,3, null],
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			var user = users[0];
			expect(user).to.have.property('id', 1);
			expect(user).to.have.property('name', 'Alex');
			expect(user).to.have.property('email', 'alex@server.com');
			expect(user).to.have.property('hpassword', 'qweqwe');
			expect(user).to.have.property('post_count_cache', 2);

			done();
		});
	});

	it('Check select custom fields', function(done) {
		dto.User.get({ 
			name: 'Alex',
			id: [1,2,3, null],
		}, {
			fields: ['id', 'name']
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			var user = users[0];
			expect(user).to.have.property('id', 1);
			expect(user).to.have.property('name', 'Alex');
			expect(user.email).to.be.NaN;
			expect(user.hpassword).to.be.NaN;
			expect(user).to.have.property('post_count_cache', 0);

			done();
		});
	});

	it('Check select demand fields', function(done) {
		dto.User.get({ 
			name: 'Alex',
			id: [1,2,3, null],
		}, {
			fields: ['id', 'name'],
			demand: ['comments_count']
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			var user = users[0];
			expect(user).to.have.property('id', 1);
			expect(user).to.have.property('name', 'Alex');
			expect(user.email).to.be.NaN;
			expect(user.hpassword).to.be.NaN;
			expect(user).to.have.property('post_count_cache', 0);

			done();
		});
	});

});