$(function () {
	window.cp = new CarPark({
		'container': '#primary-table'
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
		} else {
			$('#actionLogin').click(_.loginProcess);
			_.criticalError('guest');
		}

		// Загружаем данные
		_.load();
	};

	_.load = function () {
		// Права на этот метод
		if (_.checkRights('admin')) {

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
					// Иди проверь бля пароль олень
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

	_.genMainTable = function (data) {
		var table = $('<table>').addClass('table table-hover'),
			// Prepare header
			table_header = $('<thead>'),
			table_header_data = ['#', 'Parkplace', 'Owner', 'Money Left', 'Days Left', 'Description'];
			for (var th_index in table_header_data) {
				table_header.append($('<th>').text(table_header_data[th_index]));
			}
			table.append(table_header);
			// Render Data
			var table_body = $('<tbody>');
			for (var row in data) {
				var table_row = $('<tr>');
				for (var item in data[row]) {
					var table_cell = $('<td>').text(data[row][item]);
					table_row.append(table_cell);
				}
				table_body.append(table_row);
			}
			table.append(table_body);

			// Table Render
			_.container.empty().append(table);
	}
	
	_.log = function (data) {
		if(_.DEBUG){console.log(data);}
	};

	_.init()
}