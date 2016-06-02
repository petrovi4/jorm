var expect = require('chai').expect

var dto = require('./init');

describe("Run [JORM INTEGRITY] tests", function() {
	it('Check jorm objects exists', function() {
		expect(dto).to.have.property('User');
		expect(dto).to.have.property('Post');
		expect(dto).to.have.property('Comment');
	});

	it('Check jorm object base functions', function() {
		expect(dto.User).to.respondTo('create');
		expect(dto.Post).to.respondTo('create');
		expect(dto.Comment).to.respondTo('create');

		expect(dto.User).to.respondTo('get');
		expect(dto.Post).to.respondTo('get');
		expect(dto.Comment).to.respondTo('get');
	});
});