var expect = require('chai').expect

var dto = require('./init');

describe("Run [JOIN] tests", function() {
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


});