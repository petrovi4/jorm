var _ = require('lodash');
var expect = require('chai').expect

var dto = require('./init');

describe("Run [handlers] tests for success select, insert and update commands", function() {

	it('Check success select_before and select_after works', function(done) {	
		var params = {
			handlers: true
		};

		dto.User.get({
			id: 1
		}, params, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);

			expect(params).to.have.property('name_to_check_before');
			expect(params).to.have.property('name_to_check_after');
			expect(params).to.not.have.property('name_to_check_error');

			dto.User.get({
				name: params.name_to_check_before
			}, function (err, users) {
				expect(err).to.not.exist;
				expect(users).to.exist;
				expect(users).to.have.length(1);

				dto.User.get({
					name: params.name_to_check_after
				}, function (err, users) {
					expect(err).to.not.exist;
					expect(users).to.exist;
					expect(users).to.have.length(1);

					done();
				})
			});
		});
	});

	it('Check success insert_before and insert_after works', function(done) {	
		var params = {
			handlers: true
		};

		var user = dto.User.create({name: 'just_for_test_insert'});
		user.save(params, function (err, user) {
			expect(err).to.not.exist;
			expect(user).to.exist;

			expect(params).to.have.property('name_to_check_before');
			expect(params).to.have.property('name_to_check_after');
			expect(params).to.not.have.property('name_to_check_error');

			dto.User.get({
				name: params.name_to_check_before
			}, function (err, users) {
				expect(err).to.not.exist;
				expect(users).to.exist;
				expect(users).to.have.length(1);

				dto.User.get({
					name: params.name_to_check_after
				}, function (err, users) {
					expect(err).to.not.exist;
					expect(users).to.exist;
					expect(users).to.have.length(1);

					done();
				})
			});
		});
	});

	it('Check success update_before and update_after works', function(done) {	

		dto.User.get({
			id: 1
		}, function(err, users) {
			expect(err).to.not.exist;
			expect(users).to.exist;
			expect(users).to.have.length(1);
	
			var params = {
				handlers: true
			};

			users[0].save(params, function (err, user) {
				expect(err).to.not.exist;
				expect(user).to.exist;

				expect(params).to.have.property('name_to_check_before');
				expect(params).to.have.property('name_to_check_after');
				expect(params).to.have.not.property('name_to_check_error');

				dto.User.get({
					name: params.name_to_check_before
				}, function (err, users) {
					expect(err).to.not.exist;
					expect(users).to.exist;
					expect(users).to.have.length(1);

					dto.User.get({
						name: params.name_to_check_after
					}, function (err, users) {
						expect(err).to.not.exist;
						expect(users).to.exist;
						expect(users).to.have.length(1);

						done();
					})
				});
			});
		});
	});
});


describe("Run [handlers] tests for error while select, insert and update commands", function() {

	it('Check select_before and select_error works', function(done) {	
		var params = {
			handlers: true
		};

		dto.NotExisting.get({
			id: 1
		}, params, function(err, not_existings) {
			expect(err).to.exist;
			expect(not_existings).to.not.exist;

			expect(params).to.have.property('name_to_check_before');
			expect(params).to.not.have.property('name_to_check_after');
			expect(params).to.have.property('name_to_check_error');

			dto.User.get({
				name: params.name_to_check_before
			}, function (err, users) {
				expect(err).to.not.exist;
				expect(users).to.exist;
				expect(users).to.have.length(1);


				dto.User.get({
					name: params.name_to_check_error
				}, function (err, users) {
					expect(err).to.not.exist;
					expect(users).to.exist;
					expect(users).to.have.length(1);

					done();
				});
			});
		});
	});


	it('Check insert_before and insert_error works', function(done) {	
		var params = {
			handlers: true
		};

		var not_existing = dto.NotExisting.create({name: 'just_for_test_insert'});
		not_existing.save(params, function (err, not_existing) {
			expect(err).to.exist;

			expect(params).to.have.property('name_to_check_before');
			expect(params).to.not.have.property('name_to_check_after');
			expect(params).to.have.property('name_to_check_error');

			dto.User.get({
				name: params.name_to_check_before
			}, function (err, users) {
				expect(err).to.not.exist;
				expect(users).to.exist;
				expect(users).to.have.length(1);

				dto.User.get({
					name: params.name_to_check_error
				}, function (err, users) {
					expect(err).to.not.exist;
					expect(users).to.exist;
					expect(users).to.have.length(1);

					done();
				})
			});
		});
	});


	it('Check update_before and update_error works', function(done) {	
		var params = {
			handlers: true
		};

		var not_existing = dto.NotExisting.create({id: 1, name: 'just_for_test_insert'});
		not_existing.save(params, function (err, not_existing) {
			expect(err).to.exist;

			expect(params).to.have.property('name_to_check_before');
			expect(params).to.not.have.property('name_to_check_after');
			expect(params).to.have.property('name_to_check_error');

			dto.User.get({
				name: params.name_to_check_before
			}, function (err, users) {
				expect(err).to.not.exist;
				expect(users).to.exist;
				expect(users).to.have.length(1);

				dto.User.get({
					name: params.name_to_check_error
				}, function (err, users) {
					expect(err).to.not.exist;
					expect(users).to.exist;
					expect(users).to.have.length(1);

					done();
				})
			});
		});
	});
});



describe("Run [handlers] tests for check transaction", function() {

	it('Check select transaction', function(done) {	
		var params = {
			handlers: true,
			transaction: true
		};

		dto.NotExisting.get({
			id: 1
		}, params, function(err, not_existings) {
			expect(err).to.exist;
			expect(not_existings).to.not.exist;

			expect(params).to.have.property('name_to_check_before');
			expect(params).to.not.have.property('name_to_check_after');
			expect(params).to.have.property('name_to_check_error');

			dto.User.get({
				name: params.name_to_check_before
			}, function (err, users) {
				expect(err).to.not.exist;
				expect(users).to.exist;
				expect(users).to.have.length(0);

				dto.User.get({
					name: params.name_to_check_error
				}, function (err, users) {
					expect(err).to.not.exist;
					expect(users).to.exist;
					expect(users).to.have.length(1);

					done();
				});
			});

		});
	});


	it('Check insert_before and insert_error works', function(done) {	
		var params = {
			handlers: true,
			transaction: true
		};

		var not_existing = dto.NotExisting.create({name: 'just_for_test_insert'});
		not_existing.save(params, function (err, not_existing) {
			expect(err).to.exist;

			expect(params).to.have.property('name_to_check_before');
			expect(params).to.not.have.property('name_to_check_after');
			expect(params).to.have.property('name_to_check_error');

			dto.User.get({
				name: params.name_to_check_before
			}, function (err, users) {
				expect(err).to.not.exist;
				expect(users).to.exist;
				expect(users).to.have.length(0);

				dto.User.get({
					name: params.name_to_check_error
				}, function (err, users) {
					expect(err).to.not.exist;
					expect(users).to.exist;
					expect(users).to.have.length(1);

					done();
				})
			});
		});
	});


	it('Check update_before and update_error works', function(done) {	
		var params = {
			handlers: true,
			transaction: true
		};

		var not_existing = dto.NotExisting.create({id: 1, name: 'just_for_test_insert'});
		not_existing.save(params, function (err, not_existing) {
			expect(err).to.exist;

			expect(params).to.have.property('name_to_check_before');
			expect(params).to.not.have.property('name_to_check_after');
			expect(params).to.have.property('name_to_check_error');

			dto.User.get({
				name: params.name_to_check_before
			}, function (err, users) {
				expect(err).to.not.exist;
				expect(users).to.exist;
				expect(users).to.have.length(0);

				dto.User.get({
					name: params.name_to_check_error
				}, function (err, users) {
					expect(err).to.not.exist;
					expect(users).to.exist;
					expect(users).to.have.length(1);

					done();
				})
			});
		});
	});


});

