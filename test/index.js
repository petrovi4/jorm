var should = require('should');

var connectionString = "postgres://localhost/jorm_test";

describe('core', function () {

	before(function(done){

		var config = {
			Parent1: {
				table: 'parent_1',
				fields:{
					id: {},
					created: {},
					name: {}
				}
			},
			Child1: {
				table: 'child_1',
				fields:{
					id: {},
					created: {},
					name_child: {},
					parent_1_id: {}
				}
			}
		};

		var jormModule = require('../src/jorm');
		console.log(jormModule);
		jorm = new jormModule({connectionString: connectionString, logSQL: false, log: false}, config);

		done();
	});
	
	it('Должен содержать объекты Parent1', function () {
		jorm.should.have.property('Parent1');
	});	

	it('Parent1 должен содержать методы internalWhereProcess, getSelectFields, get', function () {
		//jorm.Parent1.should.have.property('internalWhereProcess');
		jorm.Parent1.should.have.property('selectFields');
		jorm.Parent1.should.have.property('get');
	});	

	var parent1;

	it('Простой SELECT', function (done) {
		jorm.Parent1.get({id: 1}, function (err, parents1) {
			should.not.exist(err);

			parents1.length.should.be.equal(1);

			parent1 = parents1[0];

			parent1.id.should.equal(1);
			parent1.name.should.equal('test1');

			done();
		});
	});	

	it('SELECT с поиском', function (done) {
		jorm.Parent1.get({search: {columns: ['name', 'name'], value: '%e%'}}, function (err, parents1) {
			should.not.exist(err);

			parents1.length.should.be.equal(1);

			parent1 = parents1[0];

			parent1.id.should.equal(1);
			parent1.name.should.equal('test1');

			done();
		});
	});	

	it('Обновление', function (done) {
		parent1.name = 'test2';
		parent1.save(function (err, newParent1) {
			should.not.exist(err);

			jorm.Parent1.get({id: 1}, function (err, parents1) {
				should.not.exist(err);

				parents1.length.should.be.equal(1);

				parent1 = parents1[0];

				parent1.id.should.equal(1);
				parent1.name.should.equal('test2');

				parent1.name = 'test1';
				parent1.save(function (err, newParent1) {
					should.not.exist(err);
					done();
				});
			});
		})
	});	

	var tempName = 'temp_' + (new Date()).getTime();
	it('Создание', function (done) {
		var newParent1 = jorm.Parent1.create({name: tempName});
		newParent1.save(function (err, newParent1) {
			should.not.exist(err);

			jorm.Parent1.get({name: tempName}, function (err, parents1) {
				should.not.exist(err);

				parents1.length.should.be.equal(1);

				parent1 = parents1[0];

				parent1.name.should.equal(tempName);
				done();
			});
		})
	});	

	it('Удаление', function (done) {
		jorm.Parent1.get({name: tempName}, function (err, parents1) {
			should.not.exist(err);

			parents1.length.should.be.equal(1);

			parent1 = parents1[0];

			parent1.name.should.equal(tempName);

			parent1.delete(function (err) {
				should.not.exist(err);
				done();
			})
		});
	});	


	it('SELECT + JOIN PARENT', function (done) {
		jorm.Child1.get({id: 1, join: ['Parent1'], limit: 2}, function (err, childs1) {
			should.not.exist(err);

			childs1.length.should.be.equal(1);

			child1 = childs1[0];
			// console.log('child1', child1);
			// console.log('child1.Parent1[0]', child1.Parent1[0]);

			child1.id.should.equal(1);
			child1.name_child.should.equal('nameChild1');

			should.exist(child1.Parent1);
			child1.Parent1.length.should.be.equal(1);
			child1.Parent1[0].id.should.equal(1);

			done();
		});
	});	

	it('SELECT + JOIN CHILDS', function (done) {
		jorm.Parent1.get({id: 1, join: [{essence: 'Child1', field: 'id', joinField: 'parent_1_id'}]}, function (err, parents1) {
			should.not.exist(err);
			// console.log(parents1);

			parents1.length.should.be.equal(1);

			parent1 = parents1[0];

			parent1.id.should.equal(1);
			parent1.name.should.equal('test1');

			should.exist(parent1.Child1);
			parent1.Child1.length.should.equal(2);

			done();
		});
	});	
});