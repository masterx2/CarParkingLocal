$(function () {
	window.cp = new CarPark({
		'container': '#primary-display'
	});
});

function CarPark (opts) {
	var _ = this;
	_.init = function () {
		_.DEBUG = true;
		_.auth = false;
		_.container = $(opts.container);

		_.log('Проснулися, начинаем шевелится');
		// Читаем главное хранилище на предмет пользователей
		_.users = JSON.parse(localStorage.getItem('users'));
		if (_.users == null) {
			_.criticalError('custom', 'Error Read Users Object!')
			throw 'Бля чёт с хранилищем, не могу получить список пользователей';
		}
		// Строим интерфейс
		_.checkRights();
		if(_.auth) {
			var user_title = $('<li>'),
				user_href = $('<a>')
					.attr({'href': '#',
						   'id': 'logoutlink',
						   'data-toggle': 'modal',
						   'data-target': '#logout'
						  })
					.text(_.auth_user.realname+' ')
					.append('<span class="label label-danger">Выход</span>')
					.click(_.logout);
			$('#login-control').empty().append(user_title.append(user_href));
			if (_.auth_rights.indexOf('batman') == -1) {$('.vardump').remove();$('#debug').remove()}
		} else {
			$('#actionLogin').click(_.loginProcess);
			$('.vardump').remove();$('#debug').remove();
			_.criticalError('guest');
		}

		$('#manageUsers').click(function(){_.container.empty();_.manageUsers()});
		$('#saveUser').click(_.saveUser);
		$('.vardump').hide();
		$('#debug').click(function(){$('.vardump').slideToggle();})

		// Загружаем данные
		_.load();
	};

	_.load = function () {
		// Права на этот метод
		if (_.checkRights('user')) {
			// Читаем главное хранилище загружаем главный объект
			_.data = localStorage.getItem('main-storage');
			if (_.data != null) {

			} else {
				_.criticalError('custom', 'бля базы то нету)');
			}
		} else {_.criticalError('no-rights');}
	};

	_.loginProcess = function() {
		_.log('Ну давай знакомится хули)');
		var username = $('#inputLogin').val(),
			password = $('#inputPassword').val();
		if (!username == '' || !password == '') {
			// Всё ввел? Молодец какой
			if (Object.keys(_.users).indexOf(username) != -1) {
				// Логин совпал, может ты не знаешь пароля?
				var passwordHash = CryptoJS.SHA3(password).toString();
				if (passwordHash == _.users[username].hash) {
					// Знаешь пароль? Нихера) Крутой
					// Выставляем права и аутификацию
					_.auth = true;
					_.auth_rights = _.users[username].rights;
					_.auth_user = _.users[username];
					// Ставим сессию
					var auth = {'username': username,
								'sessionHash': _.generateSessionHash(username)
							   };
					sessionStorage.setItem('auth', JSON.stringify(auth));
					// Теперь как братья
					window.location.reload();
				} else {
					// Иди проверь пароль олень
					_.criticalError('wrong-pass');
					$('#loginModal').modal('hide');	
				}
			} else {
				_.criticalError('no-user');
				$('#loginModal').modal('hide');	
			}
		} else {
			_.criticalError('empty_login_password');
			$('#loginModal').modal('hide');
		}
	}

	_.logout = function () {
		// Это была последняя капля, я ухожу!!!
		sessionStorage.clear();
		_.auth = false;
		_.auth_user = null;
		_.auth_rights = null;
		window.location.reload();
	}

	_.checkRights = function(requestedRights) {
		_.log('А ты кто такой?');		
		// Для начала проверяем аутификацию
		if (_.auth !== false) {
			_.log('О! Пользователь, Привет ;)');
			// Проверка прав для текущего действия
			if (_.auth_rights.indexOf(requestedRights) != -1
				|| _.auth_rights.indexOf('batman') != -1) {
				// Пользователь вошел и у него есть права!
				return true;
			} else {
				_.log('Ненене, тебе сюда нельзя');
				return false;
			}
		} else {
			_.log('Может я тебя помню?');
			// Проверяем есть ли запись в текущей сессии
			if (sessionStorage.getItem('auth') !== null) {
				// Опа чирик, запись есть, валидируем
				var sessionAuth = JSON.parse(sessionStorage.getItem('auth')),
					s_user = sessionAuth.username,
					s_hash = sessionAuth.sessionHash;
					if (s_hash == _.generateSessionHash(s_user)) {
						// Сессия опознана выставляем аутификацию
						// и отправляем на проверку прав
						_.log('А это ты, проходи');
						_.auth = true;
						_.auth_rights = _.users[s_user].rights;
						_.auth_user = _.users[s_user];
						_.checkRights(requestedRights);
					} else {
						// Сессия не валидна, отправляемся логинится
						_.log('Не узнаю ваc в гриме');
					}
			} else {
				// Сессии нету, вали логинится потом отчитаешся
				_.log('Я тя вообще первый раз вижу слыш');
			}
		}
		return false
	}

	_.manageUsers = function () {
		// Права на этот метод
		if (_.checkRights('user')) {
			// Перекличка! 
			var users = JSON.parse(localStorage.getItem('users')),
				wrapper = $('<div>').addClass('col-sm-offset-2 col-sm-8'),
				addButton = $('<button>')
					.text('Добавить')
					.addClass('btn btn-info')
					.click(function(){_.editUser('addNew')});
			if (users != null) {
				_.container.append(wrapper.append(_.generateWindow('Управление Пользователями',
					_.generateUserGrid(users).append(addButton))));
			} else {
				_.criticalError('custom', 'Пользователи не найдены, это пиздец странно!');
			}
		} else {_.criticalError('no-rights');}
	}

	_.editUser = function (user) {
		if (_.checkRights('admin')) {
			if (user != 'addNew') {
				var username = $(user)
					.parent().parent()
					.children(':nth-child(1)')
					.text(),
					realname = _.users[username].realname,
					rights = _.users[username].rights.join(',');
				$('#loginEdit').attr('disabled','').val(username);
				$('#nameEdit').val(realname);
				$('#rightsEdit').val(rights)
				$('#delUser').show().click(function() {
					_.delUser(username);
				});
			} else {
				$('#delUser').hide().unbind();
				$('#loginEdit').val('').removeAttr('disabled');
				$('#passwordEdit').val('');
				$('#nameEdit').val('');
				$('#rightsEdit').val('');
			}
			$('#userModal').modal('show');
		} else {_.criticalError('no-rights');}
	}

	_.saveUser = function () {
		var login = $('#loginEdit').val(),
			pass = $('#passwordEdit').val(),
			name = $('#nameEdit').val(),
			rights = $('#rightsEdit').val().split(',');
		
		$('#userModal').modal('hide');
		
		if (login == '' || name == '' || rights.lenght < 1) {
			_.criticalError('custom', 'Неверный формат данных!');
		} else {
			if (pass == '') {
				var hash = _.users[login].hash;
			} else {
				var hash = CryptoJS.SHA3(pass).toString();
			}
			_.users[login] = {
				'realname': name,
				'rights' : rights,
				'hash' : hash
			}
			_.log([login, pass, name, rights]);
			localStorage.setItem('users', JSON.stringify(_.users));
			_.container.empty();
			_.infoMessage('Данные успешно изменены!');
			_.manageUsers();
		}
	}

	_.delUser = function (username) {
		delete _.users[username];
		localStorage.setItem('users', JSON.stringify(_.users));
		_.container.empty();
		_.infoMessage('Данные успешно изменены!');
		_.manageUsers();
		$('#userModal').modal('hide');
	}

	_.generateUserGrid = function (users) {
		table_header_data = ['Логин', 'Имя', 'Права'];
		var data = {}
		for (user in users) {
			data[user] = [user,
						  users[user].realname,
						  users[user].rights.join(','),
						  $('<button>')
						  	.text('Изменить')
						  	.addClass('btn btn-success')
						  	.click(function(){_.editUser(this);})
						  ];
		}
		return _.generateTable(table_header_data, data);
	}

	_.generateWindow = function (header, content) {
		var okno = $('<div>').addClass('panel panel-primary'),
			heading = $('<div>').addClass('panel-heading')
				.append($('<h3>').addClass('panel-title').text(header)),
			body = $('<div>').addClass('panel-body').append(content);
		return okno.append(heading).append(body);
	}

	_.generateSessionHash = function(username) {
		var magic = new Date().getTime().toString().slice(0,5);
		return CryptoJS.MD5('AbrAcAdaBra'+username+magic).toString();
	}

	_.criticalError = function(errorId, custom_message) {
		switch (errorId) {
			case 'custom':
				// Кастом ворнинг
				var message = custom_message;
				break;
			case 'empty_login_password':
				// Мистер никто
				var message = "Ну и что это было? Поля нужно заполнять!";
				break;
			case 'wrong-pass':
				// Записывай пароль баран!
				var message = "Отказ аутификации, пароль не подошел";
				break;
			case 'guest':
				// Пришел незнакомый мне человек
				var message = "Необходима авторизация";
				break;
			case 'no-rights':
				// У пользователя нет прав
				var message = "У вас нет прав для совершения данного действия";
				break;
			case 'no-user':
				// Таких мы не знаем
				var message = "Отказ аутификации, такого пользователя не существует";
				break;
			default:
				// Хрен знает почему, но мы закрыты)
				var message = "Что-то пошло не так. Просто смирись с этим.";
				break;
		}
		_.container.empty().append('<div class="alert alert-warning"><button type="button" \
			class="close" data-dismiss="alert" aria-hidden="true">&times;</button><strong> \
			Внимание!</strong> '+message+'</div>');
	}

	_.infoMessage = function(custom_message) {
		_.container.empty().append('<div class="alert alert-success"><button type="button" \
			class="close" data-dismiss="alert" aria-hidden="true">&times;</button><strong> \
			Внимание!</strong> '+custom_message+'</div>');
	}

	_.generateTable = function (table_header_data, data) {
		var table = $('<table>').addClass('table table-hover'),
			// Prepare header
			table_header = $('<thead>');
		for (var th_index in table_header_data) {
			table_header.append($('<th>').text(table_header_data[th_index]));
		}
		table.append(table_header);
		// Render Data
		var table_body = $('<tbody>');
		for (var row in data) {
			var table_row = $('<tr>');
			for (var item in data[row]) {
				var table_cell = $('<td>').append(data[row][item]);
				table_row.append(table_cell);
			}
			table_body.append(table_row);
		}
		return table.append(table_body);
	}
	
	// Tools
	_.log = function (data) {
		if(_.DEBUG){console.log(data);}
	};

	_.vardump = function (data) {
		$('.vardump').empty().append(_.jsonPretty.prettyPrint(data)).slideDown();
	}

	_.jsonPretty = {
		replacer: function(match, pIndent, pKey, pVal, pEnd) {
			var key = '<span class=json-key>';
	        var val = '<span class=json-value>';
	        var str = '<span class=json-string>';
	        var r = pIndent || '';
	        if (pKey)
	        	r = r + key + pKey.replace(/[": ]/g, '') + '</span>: ';
	        if (pVal)
	        	r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
	        return r + (pEnd || '');
	    },
	    prettyPrint: function(obj) {
	    	var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
	    		return JSON.stringify(obj, null, 3)
	    		.replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
	            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
	            .replace(jsonLine, _.jsonPretty.replacer);
	        }
	    };

	_.init()
}