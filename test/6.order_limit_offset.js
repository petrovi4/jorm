var expect = require('chai').expect;

var dto = require('./init');

describe('Run [ORDER-LIMIT-OFFSET] tests', function() {
	it('Check select with simlpe order asc', function(done) {
		dto.User.get({
		}, {
			order: {field: 'id'}
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length.above(3);

			expect(users[0]).to.have.property('id', 1);
			expect(users[1]).to.have.property('id', 2);
			expect(users[2]).to.have.property('id', 3);

			done();
		});
	});

	it('Check select with order desc', function(done) {
		dto.User.get({
			id: {comparsion: '<=', value: 3}
		}, {
			order: {field: 'name', direction: 'desc'}
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(3);

			expect(users[0]).to.have.property('id', 3);
			expect(users[1]).to.have.property('id', 2);
			expect(users[2]).to.have.property('id', 1);

			done();
		});
	});

	it('Check select with order, limit and affset', function(done) {
		dto.User.get({
			id: {comparsion: '<=', value: 3}
		}, {
			order: {field: 'id'},
			limit: 1,
			offset: 1
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			expect(users[0]).to.have.property('id', 2);

			done();
		});
	});

});