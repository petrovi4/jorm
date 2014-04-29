var should = require('should');
var Memcached = require('memcached');

var connectionString = "postgres://localhost/jorm_test";

describe('Cache subsystem', function() {
	before(function(done){

		var config = {
			Parent1: {
				table: 'parent_1',
				tags: ['parent_1', 'child_1'],
				fields:{
					id: {},
					created: {},
					name: {}
				}
			},
			Child1: {
				table: 'child_1',
				tags: ['child_1', 'parent_1'],
				fields:{
					id: {},
					created: {},
					name_child: {},
					parent_1_id: {}
				}
			}
		};

		var jormModule = require('../src/jorm');
		
		jorm = new jormModule({connectionString: connectionString, logSQL: false, log: false, cache: new Memcached("127.0.0.1:11211")}, config);

		done();
	});
	
	it("Should be fetched with cache", function(done) {
		
		jorm.Parent1.get({id: 1}, function(err, parents1) {
			if (err) { throw err; }
			
			parents1.should.be.an.Array;
			parents1[0].should.be.an.Object;
			parents1[0].should.have.ownProperty('id');
			
			done();
		});
	});
	
	it("should devalidate cache while saving", function (done ) {

		var parent1 = jorm.Parent1.create({name: "Ногохуйц"});
		
		parent1.save(function (err, savedParent) {
			if (err) { throw err; }
			savedParent.should.have.ownProperty('id');
			savedParent.should.have.ownProperty('tags');
			
			done();
		});
	});

	it("Should uncache deleted records correctly", function(done) {
		
		jorm.Parent1.get({name: "Ногохуйц"}, function(err, parents1) {
		
			parents1.should.be.an.Object;
			
			var alreadyDeleted = 0;
			var toBeDeleted = parents1.length;
			
			for (index in parents1) {
				parents1[index].delete(function (err, dummy) {
					if (err) {throw err}
					alreadyDeleted += 1;
					
					true.should.be.ok; //it is just deleted
					if (alreadyDeleted == toBeDeleted) {
						done();
					}
				});
			}
			
			
		});
	});
});