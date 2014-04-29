var should = require('should');
var Memcached = require('memcached');

var connectionString = "postgres://localhost/jorm_test";

var config = {
	Parent1: {
		table: 'parent_1',
		tags: ['parent_1', 'child_1'],
		fields: {
			id: {},
			created: {},
			name: {}
		}
	},
	Child1: {
		table: 'child_1',
		tags: ['child_1', 'parent_1'],
		fields: {
			id: {},
			created: {},
			name_child: {},
			parent_1_id: {}
		}
	}
};
describe('Testing cache subsystem', function() {

	it.skip("Should work without cache", function(done) {

		done();
	});

	it("Should work with cache", function(done) {
		var jormModule = require('../src/jorm');
		console.log(jormModule);
		jorm = new jormModule(
			{
				connectionString: connectionString,
				logSQL: false,
				log: true,
				cache: new Memcached("127.0.0.1:11211")
			},
			config
		);

		jorm.Parent1.get({id: 1}, function(err, parents1) {
			if (err) { throw err; }
			
			console.log(parents1);
			done();
		});
	});

	it.skip("Should uncache updated records correctly", function(done) {

		done();
	});
});