var expect = require('chai').expect;

var dto = require('./init');

describe('Run [JOIN] tests', function() {
	it('Check simple join', function(done) {
		dto.User.get({}, {
			order: {field: 'id'},
			join: [
				{join: dto.Post, field: 'user_id', parent_field: 'id'}
			]
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length.above(3);

			expect(users[0]).to.have.property('id', 1);
			expect(users[0]).to.have.property('Post');
			expect(users[0].Post).to.have.lengthOf(2);
			expect(users[0].Post[0]).to.have.property('user_id', 1);
			expect(users[0].Post[1]).to.have.property('user_id', 1);

			expect(users[1]).to.have.property('id', 2);
			expect(users[1]).to.have.property('Post');
			expect(users[1].Post).to.have.lengthOf(1);
			expect(users[1].Post[0]).to.have.property('user_id', 2);

			expect(users[2]).to.have.property('id', 3);
			expect(users[2]).to.have.property('Post');
			expect(users[2].Post).to.have.lengthOf(1);
			expect(users[2].Post[0]).to.have.property('user_id', 3);

			done();
		});
	});

	it('Check join with WHERE by parent table', function(done) {
		dto.User.get({
			id: 1
		}, {
			order: {field: 'id'},
			join: [
				{join: dto.Post, field: 'user_id', parent_field: 'id'}
			]
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			expect(users[0]).to.have.property('id', 1);
			expect(users[0]).to.have.property('Post');
			expect(users[0].Post).to.have.lengthOf(2);
			expect(users[0].Post[0]).to.have.property('user_id', 1);
			expect(users[0].Post[1]).to.have.property('user_id', 1);

			done();
		});
	});

	it('Check join with WHERE by parent table and child table', function(done) {
		dto.User.get({
			id: 1
		}, {
			order: {field: 'id'},
			join: [
				{join: dto.Post, field: 'user_id', parent_field: 'id', where: {id: 2}}
			]
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			expect(users[0]).to.have.property('id', 1);
			expect(users[0]).to.have.property('Post');
			expect(users[0].Post).to.have.lengthOf(1);
			expect(users[0].Post[0]).to.have.property('id', 2);
			expect(users[0].Post[0]).to.have.property('user_id', 1);

			done();
		});
	});

	it('Check join by join', function(done) {
		dto.User.get({
			id: 1
		}, {
			order: {field: 'id'},
			join: [
				{join: dto.Post, field: 'user_id', parent_field: 'id'},
				{join: dto.Comment, to:dto.Post, field: 'post_id', parent_field: 'id'},
			]
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			expect(users[0]).to.have.property('id', 1);
			expect(users[0]).to.have.property('Post');
			expect(users[0].Post).to.have.lengthOf(2);
			expect(users[0].Post[0]).to.have.property('user_id', 1);
			expect(users[0].Post[1]).to.have.property('user_id', 1);

			expect(users[0].Post[0].Comment).to.not.exist;

			expect(users[0].Post[1].Comment).to.have.lengthOf(2);
			expect(users[0].Post[1].Comment[0]).to.have.property('post_id', 2);
			expect(users[0].Post[1].Comment[1]).to.have.property('post_id', 2);

			done();
		});
	});

	it('Check join by join same table and multiple order clause', function(done) {
		dto.User.get({
			id: 1
		}, {
			order: [
				{field: 'id'},
				{field: 'id', dto: dto.Post},
			],
			join: [
				{join: dto.Post, field: 'user_id', parent_field: 'id'},
				{join: dto.Comment, to:dto.Post, field: 'post_id', parent_field: 'id'},
				{join: dto.User, to:dto.Comment, field: 'id', parent_field: 'user_id'},
			]
		}, function(err, users) {
			console.log(JSON.stringify(users.getPublic(), null, '\t'));

			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			expect(users[0]).to.have.property('id', 1);
			expect(users[0]).to.have.property('Post');
			expect(users[0].Post).to.have.lengthOf(2);
			expect(users[0].Post[0]).to.have.property('user_id', 1);
			expect(users[0].Post[1]).to.have.property('user_id', 1);

			expect(users[0].Post[0].Comment).to.not.exist;

			expect(users[0].Post[1].Comment).to.have.lengthOf(2);
			expect(users[0].Post[1].Comment[0]).to.have.property('post_id', 2);
			expect(users[0].Post[1].Comment[1]).to.have.property('post_id', 2);

			expect(users[0].Post[1].Comment[0].User).to.have.lengthOf(1);
			expect(users[0].Post[1].Comment[0].User[0]).to.have.property('id', 2);

			expect(users[0].Post[1].Comment[1].User).to.have.lengthOf(1);
			expect(users[0].Post[1].Comment[1].User[0]).to.have.property('id', 1);

			done();
		});
	});


	it('Check join by join same table twice to diferent parents', function(done) {
		dto.User.get({
			id: 1
		}, {
			join: [
				{join: dto.Post, field: 'user_id', parent_field: 'id'},
				{join: dto.Comment, to:dto.Post, field: 'post_id', parent_field: 'id'},
				{join: dto.User, to:dto.Comment, field: 'id', parent_field: 'user_id'},
				{join: dto.User, to:dto.Post, field: 'id', parent_field: 'user_id'},
			]
		}, function(err, users) {
			console.log(JSON.stringify(users.getPublic(), null, '\t'));

			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			expect(users[0]).to.have.property('id', 1);
			expect(users[0]).to.have.property('Post');
			expect(users[0].Post).to.have.lengthOf(2);
			expect(users[0].Post[0]).to.have.property('user_id', 1);
			expect(users[0].Post[1]).to.have.property('user_id', 1);
			

			expect(users[0].Post[0]).to.have.property('User');
			expect(users[0].Post[0].User).to.have.lengthOf(1);
			expect(users[0].Post[0].User[0]).to.have.property('id', 1);

			expect(users[0].Post[0].Comment).to.not.exist;


			expect(users[0].Post[1]).to.have.property('User');
			expect(users[0].Post[1].User).to.have.lengthOf(1);
			expect(users[0].Post[1].User[0]).to.have.property('id', 1);

			expect(users[0].Post[1].Comment).to.have.lengthOf(2);
			expect(users[0].Post[1].Comment[0]).to.have.property('post_id', 2);
			expect(users[0].Post[1].Comment[1]).to.have.property('post_id', 2);

			expect(users[0].Post[1].Comment[0]).to.have.property('User');
			expect(users[0].Post[1].Comment[0].User).to.have.lengthOf(1);
			expect(users[0].Post[1].Comment[0].User[0]).to.have.property('id', 2);

			expect(users[0].Post[1].Comment[1]).to.have.property('User');
			expect(users[0].Post[1].Comment[1].User).to.have.lengthOf(1);
			expect(users[0].Post[1].Comment[1].User[0]).to.have.property('id', 1);

			done();
		});
	});


	it('Check join by join same table twice to diferent parents with aliases', function(done) {
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
			console.log(JSON.stringify(users.getPublic(), null, '\t'));

			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			expect(users[0]).to.have.property('id', 1);
			expect(users[0]).to.have.property('Posts');
			expect(users[0].Posts).to.have.lengthOf(2);
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


});