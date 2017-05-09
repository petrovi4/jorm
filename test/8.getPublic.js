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
			expect(users[0]).to.have.property('link', 'href://site.com/user/1');

			done();
		});
	});

	it('Check getPublic structure for joined objects', function(done) {
		dto.User.get({
			id: 1
		}, {
			join: [
				{join: dto.Post, field: 'user_id', parent_field: 'id'},
				{join: dto.Comment, to:dto.Post, field: 'post_id', parent_field: 'id'},
			]
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			users = users.getPublic();

			expect(users[0]).to.have.property('id', 1);
			
			expect(users[0]).to.have.property('Post');
			expect(users[0].Post).to.have.length(2);

			expect(users[0].Post[0]).to.have.property('id', 1);
			expect(users[0].Post[0]).to.have.property('user_id', 1);

			expect(users[0].Post[0].Comment).to.not.exist;

			expect(users[0].Post[1]).to.have.property('id', 2);
			expect(users[0].Post[1]).to.have.property('user_id', 1);

			expect(users[0].Post[1]).to.have.property('Comment');
			expect(users[0].Post[1].Comment).to.have.length(2);
			expect(users[0].Post[1].Comment[0]).to.have.property('id', 1);
			expect(users[0].Post[1].Comment[1]).to.have.property('id', 2);
			expect(users[0].Post[1].Comment[0]).to.have.property('post_id', 2);
			expect(users[0].Post[1].Comment[1]).to.have.property('post_id', 2);

			done();
		});
	});

	it('Check getPublic structure for joined to joined objects with aliases', function(done) {
		dto.User.get({
			id: 1
		}, {
			join: [
				{join: dto.Post, field: 'user_id', parent_field: 'id', alias: 'Posts'},
				{join: dto.Comment, to:dto.Post, field: 'post_id', parent_field: 'id'},
				{join: dto.User, to:dto.Post, field: 'id', parent_field: 'user_id', alias: 'Creator'},
				{join: dto.User, to:dto.Comment, field: 'id', parent_field: 'user_id', alias: 'Author'},
			]
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			users = users.getPublic();

			expect(users[0]).to.have.property('id', 1);
			expect(users[0]).to.have.property('Posts');
			expect(users[0].Posts).to.have.lengthOf(2);
			expect(users[0].Posts[0]).to.have.property('id', 1);
			expect(users[0].Posts[1]).to.have.property('id', 2);
			expect(users[0].Posts[0]).to.have.property('user_id', 1);
			expect(users[0].Posts[1]).to.have.property('user_id', 1);
			
			expect(users[0].Posts[0]).to.have.property('Creator');
			expect(users[0].Posts[0].Creator).to.have.lengthOf(1);
			expect(users[0].Posts[0].Creator[0]).to.have.property('id', 1);

			expect(users[0].Posts[0].Comment).to.not.exist;

			expect(users[0].Posts[1]).to.have.property('Creator');
			expect(users[0].Posts[1].Creator).to.have.lengthOf(1);
			expect(users[0].Posts[1].Creator[0]).to.have.property('id', 1);

			expect(users[0].Posts[1].Comment).to.have.lengthOf(2);
			expect(users[0].Posts[1].Comment[0]).to.have.property('id', 1);
			expect(users[0].Posts[1].Comment[1]).to.have.property('id', 2);
			expect(users[0].Posts[1].Comment[0]).to.have.property('post_id', 2);
			expect(users[0].Posts[1].Comment[1]).to.have.property('post_id', 2);

			expect(users[0].Posts[1].Comment[0]).to.have.property('Author');
			expect(users[0].Posts[1].Comment[0].Author).to.have.lengthOf(1);
			expect(users[0].Posts[1].Comment[0].Author[0]).to.have.property('id', 2);

			expect(users[0].Posts[1].Comment[1]).to.have.property('Author');
			expect(users[0].Posts[1].Comment[1].Author).to.have.lengthOf(1);
			expect(users[0].Posts[1].Comment[1].Author[0]).to.have.property('id', 1);

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