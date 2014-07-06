    $(function () {
    $.fn.datepicker.dates['ru'] = {
        days: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"],
        daysShort: ["Вск", "Пнд", "Втр", "Срд", "Чтв", "Птн", "Суб", "Вск"],
        daysMin: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
        months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
        monthsShort: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
        today: "Сегодня",
        weekStart: 1
    };

    window.cp = new CarPark({
        'container': '#primary-display'
    });

    $('#addDate').datepicker({
    	language: "ru",
        format: "dd-mm-yyyy",
        calendarWeeks: true,
        autoclose: true,
        todayHighlight: true
    });

    $('#outDate').datepicker({
    	language: "ru",
        format: "dd-mm-yyyy",
        calendarWeeks: true,
        autoclose: true,
        todayHighlight: true
    }).on('changeDate', function(e){$('#outDate').trigger('keyup');});
});

function CarPark(opts) {
    var _ = this;
    _.init = function () {
        _.DEBUG = true;
        _.auth = false;
        _.container = $(opts.container);

        _.log('Проснулися, начинаем шевелится');
        
        // Читаем главное хранилище на предмет пользователей
        chrome.storage.local.get('users',function(data){
            _.users = data.users
            if (typeof _.users != "undefined") {
                _.buildApp();
            } else {
                _.firstRun();
            }
        })
    }

    _.firstRun = function () {
        $('.vardump').remove();
        $('#debug').remove();

        _.users = {
                "admin": {
                    "realname": "Главный Администратор",
                    "hash" : CryptoJS.SHA3('admin').toString(),
                    "rights": ["user", "admin", "batman"]
                }
            };

        chrome.storage.local.set({"users": _.users});

        var header = 'Первый запуск!',
            content = $('<h3>').text('Инициализация приложения - Парковка')
                .add($('<p>').text('Привет, для начала работы с приложением необходимо авторизироватся \
                    логин и пароль по умолчанию admin')),
            win = _.generateWindow(header, content);
        _.container.empty().append(win);
        $('#loginlink').click(_.loginProcess);
    }
    
    _.buildApp = function () {
        // Строим интерфейс
        _.checkRights();
        if (_.auth) {
            var user_title = $('<li>'),
                user_href = $('<a>')
                    .attr({'href': '#',
                        'id': 'logoutlink',
                        'data-toggle': 'modal',
                        'data-target': '#logout'
                    })
                    .text(_.auth_user.realname + ' ')
                    .append('<span class="label label-danger">Выход</span>')
                    .click(_.logout);
            $('#login-control').empty().append(user_title.append(user_href));
            if (!_.checkRights('batman')) {
                $('.vardump').remove();
                $('#debug').remove();
            } else {
                $('.vardump').hide();
                $('#debug').show().click(function () {
                    $('.vardump').slideToggle();
                });
            }

        } else {
            $('#login-control').html('<li><a id="loginlink" href="#" data-toggle="modal" data-target="#loginModal">Войти</a></li>');
            $('#actionLogin').click(_.loginProcess);
            _.container.empty();
            $('.vardump').hide();
            $('#debug').hide();
            _.criticalError('guest');
        }

        $("#inputLogin, #inputPassword").keypress(function(e){
            if (e.keyCode == 13) {
                $('#actionLogin').trigger('click');
            }
        });

        $('#mainscreen').click(function () {
            _.load();
        });

        $('#manageUsers').click(function () {
            _.container.empty();
            _.manageUsers()
        });

        $('#saveCar').click(function(){
            _.container.empty();
            _.saveCar();
            _.load();
        });

        $('#costPerDay, #sumPayed, #daysPayed, #outDate').keyup(_.calculate);
        $('#costPerDay').val('160');
        $('#clearForm').click(function(){
            $('#addCarModal input').val('');
            $('#addDate').val(_.toRusDate(new Date()));
            $('#costPerDay').val('160');
        });

        $('#saveUser').click(_.saveUser);
        $('#addCar').click(function(){
        	$('#addDate').val(_.toRusDate(new Date()));
            if (_.checkRights('user')) {
                $('#clearForm').trigger('click');
                $('#addCarModal').modal('show');
            } else {
                _.criticalError('no-rights');
            }
            if (!_.checkRights('admin')) {
            	$('#addDate').attr('disabled','');
            } else {
                $('#addDate').removeAttr('disabled');
            }

        });
        _.load();
    };



    _.load = function () {
        // Права на этот метод
        if (_.checkRights('user')) {
            // Читаем главное хранилище загружаем главный объект
            chrome.storage.local.get('main-storage', function(data) {
                _.data = data['main-storage']
                if (_.data) {
                    var now = new Date().getTime()/1e3,
                        active = [],
                        leave_today = [],
                        overdue = [],
                        tabl_header = [
                            'Квитанция',
                            'Место',
                            'Имя',
                            'Марка',
                            'Гос.Номер',
                            'Стоимость',
                            'Остаток',
                            'Дней'
                        ];

                    // Логика стоянки
                    for (var order in _.data) {
                        var car = _.data[order];
                        if (car.status == 1) {

                            var money_left = car.sumPayed - (Math.floor(((now - car.addDate)/86400))*car.costPerDay),
                                days_left = Math.floor((car.outDate - now)/86400)+1;

                            table_row = [
                                order,
                                car.placeNum,
                                car.ownerName,
                                car.carBrand,
                                $('<span>').addClass('gosnum').text(car.gosNum),
                                $('<span>').addClass('rubl').text(car.costPerDay),
                                $('<span>').addClass('rubl').text(money_left),
                                days_left
                            ];

                            if (days_left == 0) {
                                leave_today.push(table_row);
                            } else if (days_left < 0) {
                                overdue.push(table_row);
                            } else {
                                active.push(table_row);
                            }
                        }
                    }
                    // Таблица уезжающих сегодня
                    var header = $('<span>')
                            .addClass('leave-today-header')
                            .text('Машины уезжающие сегодня')
                            .add($('<span>').addClass('badge').text(leave_today.length)),
                        content = _.generateTable(tabl_header, leave_today, 'leave-today'),
                        leave_window = _.generateWindow(header, content, 'info');
                    _.container.empty().append(leave_window);
                    // Таблица активных машин
                    var header = $('<span>')
                        .addClass('active-header')
                        .text('Машины на стоянке')
                        .add($('<span>').addClass('badge').text(active.length)),
                        content = _.generateTable(tabl_header, active, 'active'),
                        active_window = _.generateWindow(header, content);
                    _.container.append(active_window);
                    // Таблица просроченных машин
                    var header = $('<span>')
                            .addClass('overdue-header')
                            .text('Просроченные машины')
                            .add($('<span>').addClass('badge').text(overdue.length)),
                        content = _.generateTable(tabl_header, overdue, 'overdue'),
                        overdue_window = _.generateWindow(header, content, 'warning');
                    _.container.append(overdue_window);

                } else {
                    _.criticalError('custom','Ошибка чтения базы!');
                    _.data = {};
                }
            });
        } else {
            _.criticalError('no-rights');
        }
    };

    _.loginProcess = function () {
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
                    _.auth_user_login = username;
                    // Ставим сессию
                    var auth = {'username': username,
                        'sessionHash': _.generateSessionHash(username)
                    };
                    sessionStorage.setItem('auth', JSON.stringify(auth));
                    // Теперь как братья
                    $('#loginModal').modal('hide');
                    $('#inputLogin').val('');
                    $('#inputPassword').val('');
                    _.buildApp();
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
        _.buildApp();
    }

    _.checkRights = function (requestedRights) {
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
                    _.auth_user_login = s_user;
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
    };

    _.calculate = function (e) {
    	var editId = e.target.id,
    		params = ['costPerDay', 'sumPayed', 'daysPayed', 'outDate'];
        var vals = {};
        for (var i in params) {
            vals[params[i]] = $('#'+params[i]).val();
        }
        if (editId == 'outDate') {
            $('#daysPayed').val(Math.floor((_.parseDate($('#outDate').val()).getTime() - _.parseDate($('#addDate').val()).getTime())/864e5));
            vals['daysPayed'] = $('#daysPayed').val();
            $('#sumPayed').val(Math.floor(parseInt(vals['costPerDay']) * parseInt(vals['daysPayed'])));
        } else {
            $('#outDate:not(#'+editId+')').val(_.toRusDate(new Date((_.parseDate($('#addDate').val()).getTime() + (parseInt(vals['daysPayed']))*864e5))));
            $('#sumPayed:not(#'+editId+')').val(Math.floor(parseInt(vals['costPerDay']) * parseInt(vals['daysPayed'])));
            $('#daysPayed:not(#'+editId+')').val(Math.floor(parseInt(vals['sumPayed']) / parseInt(vals['costPerDay'])));
        }
    };

    _.saveCar = function () {
        if(_.checkForm()) {
            var vals = {};
            $('#addCarModal input').each(function(i,v){
                vals[$(v).attr('id')] = $(v).val();
            });

            var car_id = parseInt(vals['orderNum']),
                user = {
                    login: _.auth_user_login,
                    realname: _.auth_user.realname,
                    rights: _.auth_rights
                }
                car = {
                    addDate: _.parseDate(vals['addDate']).getTime()/1e3,
                    orderNum: parseInt(vals['orderNum']),
                    placeNum: parseInt(vals['placeNum']),
                    ownerName: vals['ownerName'],
                    ownerContact: vals['ownerContact'],
                    carBrand: vals['carBrand'],
                    gosNum: vals['gosNum'],
                    costPerDay: parseInt(vals['costPerDay']),
                    sumPayed: parseInt(vals['sumPayed']),
                    daysPayed: parseInt(vals['daysPayed']),
                    outDate: _.parseDate(vals['outDate']).getTime()/1e3,
                    addUser: user,
                    status: 1,
                    description: vals['description']
                };

            _.data[car_id] = car;
            
            chrome.storage.local.set({'main-storage': _.data});
            _.infoMessage('Машина успешно поставлена на стоянку!');
            $('#addCarModal').modal('hide');
        }
    };

    _.checkForm = function() {
        var formValidated = true;
        $('#addCarModal input').each(function(i,v){
            if ($(v).val() == '' || parseInt($(v).val()) <= 0) {
                $(v).css({background: 'red'});
                setTimeout(function(){
                    $(v).css({background: 'white'});
                }, 500);
                formValidated = false;
            }
        });
        return formValidated;
    };

    _.manageUsers = function () {
        // Права на этот метод
        if (_.checkRights('user')) {
            // Перекличка!
            var wrapper = $('<div>').addClass('col-sm-offset-2 col-sm-8'),
                addButton = $('<button>')
                    .text('Добавить')
                    .addClass('btn btn-info')
                    .click(function () {
                        _.editUser('addNew')
                    });
            _.container.append(wrapper.append(_.generateWindow('Управление Пользователями',
            _.generateUserGrid(_.users).append(addButton))));
        } else {
            _.criticalError('no-rights');
        }
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
                $('#loginEdit').attr('disabled', '').val(username);
                $('#nameEdit').val(realname);
                $('#rightsEdit').val(rights)
                $('#delUser').show().click(function () {
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
        } else {
            _.criticalError('no-rights');
        }
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
                'rights': rights,
                'hash': hash
            }
            _.log([login, pass, name, rights]);
            chrome.storage.local.set({'users':_.users});
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
                    .click(function () {
                        _.editUser(this);
                    })
            ];
        }
        return _.generateTable(table_header_data, data);
    }

    _.generateWindow = function (header, content, win_class) {
        var wclass = win_class ? win_class : 'primary',
            okno = $('<div>').addClass('panel panel-' + wclass),
            heading = $('<div>').addClass('panel-heading')
                .append($('<h3>').addClass('panel-title').append(header)),
            body = $('<div>').addClass('panel-body').append(content);
        return okno.append(heading).append(body);
    }

    _.generateSessionHash = function (username) {
        var magic = new Date().getTime().toString().slice(0, 5);
        return CryptoJS.MD5('AbrAcAdaBra' + username + magic).toString();
    }

    _.criticalError = function (errorId, custom_message) {
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
        _.container.empty().append('<div class="alert alert-danger" id="infoSplash"><button type="button" \
			class="close" data-dismiss="alert" aria-hidden="true">&times;</button><strong> \
			Внимание!</strong> ' + message + '</div>');
        setTimeout(function () {
            $('#infoSplash').fadeOut();
        },1000);
    }

    _.infoMessage = function (custom_message) {
        _.container.empty().append('<div class="alert alert-success" id="infoSplash"><button type="button" \
			class="close" data-dismiss="alert" aria-hidden="true">&times;</button><strong> \
			Внимание!</strong> ' + custom_message + '</div>');
        setTimeout(function () {
        	$('#infoSplash').fadeOut();
        },1000);
    }

    _.generateTable = function (table_header_data, data, table_class) {
        var table = $('<table>').addClass('table '+table_class),
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
        if (_.DEBUG) {
            console.log(data);
        }
    };

    _.toRusDate = function (date_obj) {
        var date = {};
        date.year = date_obj.getFullYear();
        date.month = date_obj.getMonth() + 1;
        date.day = date_obj.getDate();
        for (var part in date) {
            if(date[part] < 10) { date[part] = '0' + date[part];}
        }
        return date.day+'-'+date.month+'-'+date.year;
    };

    _.parseDate = function (string) {
        var parts = string.split(' ');
        if (parts.length == 1) {
            var dateparts = parts[0].split('-'),
                timeparts = ['00','00','00'];
        } else if (parts.length == 2) {
            var dateparts = parts[0].split('-'),
                timeparts = parts[1].split(':');
        } else {
            return 'invalid date';
        }
        return new Date(dateparts[2],
            dateparts[1] - 1,
            dateparts[0],
            timeparts[0],
            timeparts[1],
            timeparts[2]);
    };

    _.vardump = function (data) {
        $('.vardump').empty().append(_.jsonPretty.prettyPrint(data)).slideDown();
    };

    _.jsonPretty = {
        replacer: function (match, pIndent, pKey, pVal, pEnd) {
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
        prettyPrint: function (obj) {
            var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
            return JSON.stringify(obj, null, 3)
                .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
                .replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(jsonLine, _.jsonPretty.replacer);
        }
    };

    _.init()
}