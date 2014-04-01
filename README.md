jorm
====

Simple orm - just orm.

## Init

Just init connectionString

```javascript
var connectionString = "postgres://user:password@server.com:5432/base";
```

db config
```javascript
var config = {
	User: {
		table: 'user',
		fields: {
			id					: {},
			created			: {},
			name				: {},
			hpassword		: {},
			email				: {},
			phone				: {}
		}
	}
};
```

and init jorm
```javascript
var jormModule = require('jorm');
jorm = new jormModule(connectionString, config);
```

# CRUD
## Create
```javascript
var newUser = jorm.User.create({name: 'John', email: 'john@connor.com'})
newUser.hpassword = someFuncToHashPass(login, password);
```

## Save
```javascript
newUser.save(function(err, user){
	if(err){ console.error(err); return; }
	console.log(user.getPublic());
});
```

## Update

essence.id == null -> make insert

essence.id != null -> make update

```javascript
user.name = newName;
user.save(function(err, user){
	if(err){ console.error(err); return; }
	console.log(user.getPublic());
});
```

## Delete
Just delete it
```javascript
user.delete(function(err){
	if(err){ console.error(err); return; }
	console.log('deleted');
})
```

## Get it from DB
... to be continued