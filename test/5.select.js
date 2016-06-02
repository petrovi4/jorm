var expect = require('chai').expect

var dto = require('./init');

describe("Run [SELECT] tests", function() {
	it('Check select by id', function(done) {
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

});