define("caller", ['jquery', 'inputmask', 'underscore', 'backbone'], function($, inputmask, underscore, backbone) {
return function($) {
//==============================================================================	
//
// Кеш для шаблонов
//
//==============================================================================
var CACHE = [];

//==============================================================================	
//
// Адресная книга
//
//==============================================================================
var AddressBook = Backbone.Model.extend({
    defaults: {
        name: "",
        phone: "",
		avatar: "",
		Is_sendway: false,
		online: false
    }
});

var AddressBookCollection = Backbone.Collection.extend({
    model: AddressBook,
	getByAttr: function(attr, value) {
		return this.detect(function(model) {
			return model.get(attr) == value; 
		});
	},
});

//==============================================================================
//
// Модель звонка
//
//==============================================================================
var RecentCall = Backbone.Model.extend({
    defaults: {
        phone: "",
        date: "",
		direction: ""		
    }	
});

// view
var RecentCallView = Backbone.View.extend({ 

	tagName : "li",

	// конвертатор Date => String
	Date2String: function(date) {
		var monthNames = ["January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"];
		return monthNames[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
	},
 
	render: function() {
		// нормализуем дату, потому что даты хранятся в виде некорректных строк (не тот формат)
		var tmp = this.model.get('date').replace(' ', 'T');		
		// получим Date
		var dt = new Date(tmp);	
		// ренедерим элемент
		this.el.innerHTML = '<span class="list-phone">' + this.model.get('phone') + '</span><br/><span class="list-date">' + this.Date2String(dt) + '</span>';
		return this;
	},
	
	initialize: function(options) {
		this.render = _.bind(this.render, this); 
		this.model.bind('change:name', this.render);
	}
});

//==============================================================================
//
// Коллекция звоноков
//
//==============================================================================
var RecentCallsCollection = Backbone.Collection.extend({
    model: RecentCall,
	url: '/'
});

// view
var RecentCallsView = Backbone.View.extend({
	
	initialize: function() {
		// ссылка на объект
		var that = this;
		
		// массив view для каждой модели в коллекции
		this._callViews = [];
		
		// заполним массив view
		this.collection.each(function(recentCall) {			
			that._callViews.push(new RecentCallView({
				model: recentCall,
				tagName : 'li'
			}));			
		});
	},
 
	render : function() {
		var that = this;
		$(this.el).empty();		
 
		_(this._callViews).each(function(view) {
			$(that.el).append(view.render().el);
		});
	}
});

//==============================================================================
//
// View первого экрана виджета
//
//==============================================================================
var Screen0 = Backbone.View.extend({
	
	el: $("#widget-screen0"),
	
	//--------------------------------------------------------------------------
	// события с обработчиками
	//--------------------------------------------------------------------------
	events: {
		'click div.number-button': 'NumberInput',
		'click div#call-button': 'GotoSecondScreen',
		'click span.list-phone': 'CopyNumberToInput',
		'click': 'FilterOutsideClicks',
		
		'keydown #input-phone-number': 'FilterOurKeyEvents',
		'keypress #input-phone-number': 'FilterOurKeyEvents',
		'keyup #input-phone-number': 'UpdatePhoneInput',
	},	
	
	// переход ко второму экрану
	GotoSecondScreen: function(e) {
		e.preventDefault();

		// проверка - кнопка активна или нет
		var btn = $(e.currentTarget);
		if (!btn.hasClass('call-button-active') || btn.text() == '') return false;
		
		// показываем загрузчик
		btn.text('');
		btn.toggleClass('call-button-active', false);
		btn.toggleClass('call-button-load', true);
		
		// получим введенный номер
		widget.phoneNumber = $(this.el).find('#input-phone-number').val();
		
		// значение по умолчанию
		widget.abonentName = '';
		widget.abonentAvatar = 'img/caller/avatar.png';
		widget.abonentStatus = false;
		
		// поиск в адресной книге
		var fnd = addressBook.getByAttr("phone", widget.phoneNumber);
		if (fnd != undefined && fnd != null)
		{
			var val = fnd.get('name');
			if (val != undefined && val != '' && val != null) widget.abonentName = val;
			val = fnd.get('avatar');				
			if (val != undefined && val != '' && val != null) widget.abonentAvatar = 'img/avatars/' + val;
			val = fnd.get('online');				
			if (val != undefined && val != '' && val != null) widget.abonentStatus = val;
		}		
		
		// сохраним ссылку
		var obj = $(this.el);

		// эмуляция асинхронного запроса
		setTimeout(
			function() {
				// закрываем текущий (первый) экран				
				obj.hide();				
				// убираем загрузчик
				btn.text('Call now');
				btn.toggleClass('call-button-active', true);
				btn.toggleClass('call-button-inactive', false);
				btn.toggleClass('call-button-load', false);
				// показываем второй экран
				widget.showScreen(1);
			},
			300
		);
	},

	// клик по панели с числом
	NumberInput: function(e) {		
		e.preventDefault();

		var str = $(e.currentTarget).text();		
		var code;
		if (str == '*') code = 42;
		else if (str == '#') code = 35;
		else if (str == '+') code = 43;
		else code = 48 + parseInt(str);
		
		if (code != undefined)
		{
			// эмуляция нажатия клавиши в поле с номером
			var D = $.Event("keydown", { which: code, keyCode: code, charCode: code, key: str });
			var P = $.Event("keypress", { which: code, keyCode: code, charCode: code, key: str });
			var U = $.Event("keyup", { which: code, keyCode: code, charCode: code, key: str });
			$(this.el).find('#input-phone-number').trigger(D).trigger(P).trigger(U);
		}
	},
	
	// обновление поля ввода с номером телефона
	UpdatePhoneInput: function(e) {

		if (e) e.preventDefault();

		// длина "чистого" номера
		var obj = $(this.el).find("#input-phone-number").inputmask('unmaskedvalue');
		var len = obj ? obj.length : 0;
		
		// включать или не включать кнопку вызова
		if (len == 10) $(this.el).find('#call-button').toggleClass('call-button-active', true);
		else $(this.el).find('#call-button').toggleClass('call-button-active', false);		
		
		return false;
	},
	
	// копирует номер из истории в поле ввода
	CopyNumberToInput: function(e) {		
		e.preventDefault();
		// получим номер как есть, с маской
		var num = $(e.currentTarget).text();
		// так как номер уже с маской, просто ставим его в поле и инициируем обновление поля
		$(this.el).find('#input-phone-number').inputmask("setvalue", num);
		$(this.el).find('#input-phone-number').trigger('keyup');
		return false;
	},
	
	// фильтруем клики мыши, дальше текущего блока не пускаем
	FilterOutsideClicks: function(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	},
	
	// фильтруем клики мыши, дальше текущего блока не пускаем
	FilterOurKeyEvents: function(e) {
		if (e.originalEvent == undefined)
		{
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	},
	
	//--------------------------------------------------------------------------
	// служебные функции
	//--------------------------------------------------------------------------
	// показать экран
	show: function() {
		// рендерим каждый раз, так как могут передаваться новые данные,
		// например новая запись в истории звонка
		this.render();
		// показываем экран
		$(this.el).css({opacity: 0});		
		$(this.el).show();
		$(this.el).animate({opacity: 1}, 200);
	},
	
	// плавно скрыть
	hide: function() {
		var obj = $(this.el);
		obj.animate({opacity: 0}, {duration: 200, queue: false, complete: function() {obj.hide(); $('#widget-block').hide();}});
	},
	
	//--------------------------------------------------------------------------
	// отрисовка
	//--------------------------------------------------------------------------	
	render: function () {		
		// запоминаем ссылку на объект
		var obj = $(this.el);
		// маска
		var phoneMask = '+7 (999) 999-99-99';
		
		// если кеш у нас уже есть
		if (CACHE[0] != undefined)
		{
			// применим шаблон, что бы пересчитались все переменные шаблона
			obj.html(CACHE[0]);
			// панель отрисована - ставим маску для поля ввода
			obj.find('#input-phone-number').inputmask({"mask": phoneMask});
			// если был введенный номер - ставим и его и делаем проверку поля
			if (widget.phoneNumber.length)
			{
				$(this.el).find('#input-phone-number').val(widget.phoneNumber).trigger('keypress').blur();
				this.UpdatePhoneInput(false);
			}
			
			// получим асинхронно историю звонков
			widget.getRecentCalls(function(calls) {
				// берем только 4 первых
				var first = calls.length > 4 ? calls.slice(0, 4) : calls;
				// рендерим историю звонков
				var view = new RecentCallsView({
					el: $('#recent-calls-list'),
					collection: new RecentCallsCollection(first)
				});
				view.render();
			});
			
			return;
		}
		
		// в кеше шаблона нет - асинхронно качаем шаблон
		$.ajax({
			url: 'js/templates/screen0.html',
			success: function(data) {
				
				// установим функцию шаблона
				var temp = _.template($(data).html());
				// шаблон в кеш
				CACHE[0] = temp();
				// применим шаблон
				obj.html(CACHE[0]);
				// панель отрисована - ставим маску для поля ввода
				obj.find('#input-phone-number').inputmask({"mask": phoneMask});
				// если был введенный номер - ставим и его проверяем поле
				if (widget.phoneNumber.length)
				{
					$(this.el).find('#input-phone-number').val(widget.phoneNumber).trigger('keypress').blur();
					this.UpdatePhoneInput(false);
				}
				
				// получим асинхронно историю звонков
				widget.getRecentCalls(function(calls) {
					// рендерим историю звонков
					var view = new RecentCallsView({
						el: $('#recent-calls-list'),
						collection: new RecentCallsCollection(calls)			
					});
					view.render();
				});
			}
		});		
	}	
});

//==============================================================================
//
// View вторго экрана виджета
//
//==============================================================================
var Screen1 = Backbone.View.extend({
	
	el: $("#widget-screen1"),
	
	//--------------------------------------------------------------------------
	// события с обработчиками
	//--------------------------------------------------------------------------
	events: {
		'click div#first-button': 'FirstButton',
		'click div#second-button': 'SecondButton',
		'click div#cancel-button': 'CancelButton',
	},	
	
	FirstButton: function(e) {
		e.preventDefault();
		// закрываем второй экран
		$(this.el).hide();
		// закрываем блок виджета, в третьем экране используется иной шаблок
		$('#widget-block').hide();
		// устанавливаем тип звонка
		widget.callType = 'Sendway';
		// устанавливаем направление звонка
		widget.callDirection = 'Outgoing';
		// обнуляем стоимость
		widget.callPrice = '';
		// показываем третий экран
		widget.showScreen(2);
		return false;
	},
	
	SecondButton: function(e) {
		e.preventDefault();
		// закрываем второй экран
		$(this.el).hide();
		// закрываем блок виджета, в третьем экране используется иной шаблок
		$('#widget-block').hide();
		this.hide();
		// устанавливаем тип звонка
		widget.callType = 'GSM';
		// устанавливаем направление звонка
		widget.callDirection = 'Outgoing';
		// показываем третий экран
		widget.showScreen(2);
		return false;
	},
	
	CancelButton: function(e) {
		e.preventDefault();		
		// закрываем текущий (второй) экран	и сам блок
		this.hide();
		return false;
	},
	
	//--------------------------------------------------------------------------
	// служебные функции
	//--------------------------------------------------------------------------
	// показать экран
	show: function() {
		// рендерим каждый раз, так как могут передаваться новые данные,
		// например новый номер телефона и новая стоимость звонка
		this.render();
		
		// показываем экран после рендеринга
		$(this.el).css({opacity: 0});		
		$(this.el).show();
		$(this.el).animate({opacity: 1}, 200);
	},
	
	// плавно скрыть
	hide: function() {
		var obj = $(this.el);
		obj.animate({opacity: 0}, {duration: 200, queue: false, complete: function() {obj.hide(); $('#widget-block').hide();}});
	},
	
	//--------------------------------------------------------------------------
	// отрисовка
	//--------------------------------------------------------------------------
	render: function () {
		// запоминаем ссылку на объект
		var obj = $(this.el);
		
		// если у нас уже есть кеш шаблона
		if (CACHE[1] != undefined)
		{
			// применим шаблон - передадим в шаблон 1 переменную (объект)
			// запрос стоимости идет асинхронно
			widget.getPrice(function(data) {
				// запоминаем стоимость
				widget.callPrice = +data.price + ' ' + data.cur.toUpperCase();
				// формируем аргумент
				var arg = {
					phoneNumber: widget.abonentName != '' ? widget.abonentName : widget.phoneNumber,
					callPrice: widget.callPrice,
					status: widget.abonentStatus
				};								
				// сам рендеринг
				obj.html(CACHE[1](arg));
			});
			
			return;
		}
		
		// в кеше нет шаблона - асинхронно качаем шаблон
		$.ajax({
			url: 'js/templates/screen1.html',
			success: function(data) {
				// установим функцию шаблона
				var temp = _.template($(data).html());
				// функцию шаблона в кеш
				CACHE[1] = temp;
				// применим шаблон - передадим в шаблон 1 переменную (объект)
				// запрос стоимости идет асинхронно
				widget.getPrice(function(data) {
					// запоминаем стоимость
					widget.callPrice = +data.price + ' ' + data.cur.toUpperCase();
					// формируем аргумент
					var arg = {
						phoneNumber: widget.abonentName != '' ? widget.abonentName : widget.phoneNumber,
						callPrice: widget.callPrice,
						status: widget.abonentStatus
					};					
					// сам рендеринг
					obj.html(CACHE[1](arg));
				});
			}
		});
	}	
});

//==============================================================================
//
// View третьего экрана виджета
//
//==============================================================================
var Screen2 = Backbone.View.extend({
	
	el: $("#widget-screen2"),
	
	//--------------------------------------------------------------------------
	// события с обработчиками
	//--------------------------------------------------------------------------
	events: {
		'click div.modal-top-menu': 'TopMenu',
		'click div#modal2-stop-button': 'StopButton',
	},	
	
	TopMenu: function(e) {
		e.preventDefault();
		console.log('top-menu');
		return false;
	},
	
	StopButton: function(e) {
		e.preventDefault();
		console.log('stop');
		return false;
	},
	
	//--------------------------------------------------------------------------
	// служебные функции
	//--------------------------------------------------------------------------
	// показать экран
	show: function() {
		// рендерим каждый раз, так как могут передаваться новые данные,
		// например новый номер телефона и новая стоимость звонка
		this.render();
		
		// показываем родительский блок если он еще не показан
		var parent = $(this.el).parent();
		if (!parent.is(':visible'))
		{
			parent.css({opacity: 0});		
			parent.show();
			parent.animate({opacity: 1}, 200);
		}
		// сохраняем ссылку
		var obj = $(this.el);
		// восстановим прозрачность
		obj.animate({opacity: 1}, 0);

		// грузим музыку
		widget.audio = new Audio();
		widget.audio.preload = 'auto';
		widget.audio.autoplay = false;
		widget.audio.src = "/snd/snd.mp3";		

		// показываем сам экран
		$(this.el).show({
			// эмуляция установления соединения 1 секунда
			duration: 0,
			complete: function() {
				setTimeout(function() {
					// скрываем третий экран					
					obj.animate(
						{opacity: 0},
						{duration: 200, queue: false, complete: function() {
							obj.hide();							
							// показываем четвертый
							widget.showScreen(3);
						}
					});					
				}, 1500);
			}
		});
	},
	
	//--------------------------------------------------------------------------
	// служебные функции
	//--------------------------------------------------------------------------	
	render: function () {		
		// запоминаем ссылку на объект
		var obj = $(this.el);		
		
		// если кеш шаблона уже есть
		if (CACHE[2] != undefined)
		{
			// применим шаблон - передадим в шаблон 1 переменную (объект)
			var arg = {
				phoneNumber: widget.abonentName != '' ? widget.abonentName : widget.phoneNumber,
				callDirection: widget.callDirection,
				callType: widget.callType,
				avatar: widget.abonentAvatar,
				status: widget.abonentStatus
			};			
			// рендеринг
			obj.html(CACHE[2](arg));
			return;
		}
		
		// если кеша шаблона нет - асинхронно качаем шаблон
		$.ajax({
			url: 'js/templates/screen2.html',
			success: function(data) {
				// установим функцию шаблона
				var temp = _.template($(data).html());
				// шаблон в кеш
				CACHE[2] = temp;
				// применим шаблон - передадим в шаблон 1 переменную (объект)
				var arg = {
					phoneNumber: widget.abonentName != '' ? widget.abonentName : widget.phoneNumber,
					callDirection: widget.callDirection,
					callType: widget.callType,
					avatar: widget.abonentAvatar,
					status: widget.abonentStatus
				};				
				// рендеринг
				obj.html(CACHE[2](arg));
			}
		});
	}	
});

//==============================================================================
//
// View четвертого экрана виджета
//
//==============================================================================
var Screen3 = Backbone.View.extend({
	
	el: $("#widget-screen3"),
	
	//--------------------------------------------------------------------------
	// события с обработчиками
	//--------------------------------------------------------------------------
	events: {
		'click #button-mute': 'Mute',
		'click #button-keypad': 'Keypad',
		'click div.modal-top-menu': 'TopMenu',
		'click #modal3-stop-button': 'StopButton',
		'click': 'FilterOutsideClicks'
	},

	// кнопка "mute"
	Mute: function(e) {
		e.preventDefault();
		$(this.el).find('div#button-mute').toggleClass('modal3-button-active');
		return false;
	},
	
	// кнопка "keypad"
	Keypad: function(e) {
		e.preventDefault();
		
		// включим кнопку
		$(this.el).find('div#button-keypad').toggleClass('modal3-button-active');
		// передвинем блок
		var move = $(this.el).find('div#button-keypad').hasClass('modal3-button-active') ? "-=105px" : "+=105px";		
		$(this.el).find('div.modal3').first().animate({
				top: move,
			},  { duration: 100, queue: false }
		);
		// и одновременно покажем/скроем кейпад
		if (move == "-=105px") $(this.el).find('div#modal3-keypad-wrapper').show({duration: 100, queue: false});
		else $(this.el).find('div#modal3-keypad-wrapper').hide({duration: 100, queue: false});

		return false;
	},
	
	// кнопка "скрыть" в верхнем правом углу
	TopMenu: function(e) {
		e.preventDefault();
		// скроем блок
		$(this.el).find('div.modal3').first().animate({
			opacity: 0.1,			
		}, 300, function() {
			// покажем пятый экран и одновременно скроем модальный блок
			widget.showScreen(4);
		});
		
		return false;
	},
	
	StopButton: function(e) {

		if (e) e.preventDefault();

		// убираем таймер
		this.Timer.stop();

		// прекращаем проигрывание звука
		widget.stopAudio();
		
		// заносим данные в историю звонка
		var dt = new Date();
		var M = dt.getMonth() + 1, D = dt.getDate(), h = dt.getHours(), m = dt.getMinutes(), s = dt.getSeconds();
		var str = dt.getFullYear() + '-' +
			(M < 10 ? '0'+M : M) + '-' +
			(D < 10 ? '0'+D : D) + ' ' +
			(h < 10 ? '0'+h : h) + ':' +
			(m < 10 ? '0'+m : m) + ':' +
			(s < 10 ? '0'+s : s);
		recentCalls.create(
			{
				"phone": widget.phoneNumber,
				"date": str,
				"direction": "out"
			},
			{at: 0}
		);
		
		// скроем блок
		var obj = $(this.el);
		$(this.el).find('div.modal3').first().animate({
			opacity: 0,			
		}, 300, function() {
			// скроем все блоки
			obj.hide();
			obj.parent().hide();
			// вернемся на старт виджета
			widget.CurrentScreenNo = -1;
		});
		
		return false;
	},
	
	// фильтруем клики мыши, дальше текущего блока не пускаем
	FilterOutsideClicks: function(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	},	
	
	//--------------------------------------------------------------------------
	// Таймер отсчета времени звонка
	//--------------------------------------------------------------------------
	Timer: {
		obj: null,
		timerCount: 0,
		timerID: null,
		timerTick: function() {

			// расчет 
			var m = '', s = '';
			if (this.timerCount < 60)
			{
				m = '00'; s = this.timerCount < 10 ? '0' + this.timerCount : this.timerCount;
			}
			else
			{
				var mn = Math.floor(this.timerCount / 60);
				m = mn < 10 ? '0' + mn : mn;
				var sn = this.timerCount % 60;
				s = sn < 10 ? '0' + sn : sn;			
			}
			// запоминаем расчетные данные, для того что бы при
			// отрисовки screen4 сразу показать корректный отсчет
			this.mins = m; this.secs = s;

			// рендеринг в четвертом экране
			$(this.obj.el).find('span#mins').text(m);
			$(this.obj.el).find('span#secs').text(s);
			
			// рендеринг в пятом экране
			var $screen4 = $(this.obj.el).parent().parent().find('div#widget-screen4');
			if ($screen4.length)
			{
				$screen4.find('span#mins').text(m);
				$screen4.find('span#secs').text(s);
			}

			// отсчет
			this.timerCount++;
		},
		
		start: function(that) {			
			that.Timer.obj = that;
			that.Timer.timerCount = 0;
			that.Timer.timerID = setInterval(function() {that.Timer.timerTick.call(that.Timer)}, 1000);
			that.Timer.timerTick();
		},
		
		stop: function() {
			clearInterval(this.timerID);
		},

		mins: '',
		secs: ''
	},	
	
	//--------------------------------------------------------------------------
	// служебные функции
	//--------------------------------------------------------------------------
	// показать экран
	show: function() {
		// рендерим каждый раз, так как могут передаваться новые данные,
		// например новый номер телефона и новая стоимость звонка
		this.render();
		// показываем родительский блок если он еще не показан
		if (!$(this.el).parent().is(':visible')) $(this.el).parent().show();
		// показываем сам экран
		var that = this;
		$(this.el).show({
			duration: 0,
			// окно экрана показано
			complete: function() {
				// запускаем музыку
				widget.playAudio();
				// если музыка закончится, то закрываем виджет
				widget.audio.onended = function(e) { widget.event_StopAudio(e); }
				// запуск таймера
				that.Timer.start(that);
			}
		});
	},

	//--------------------------------------------------------------------------
	// отрисовка
	//--------------------------------------------------------------------------
	render: function () {		
		// запоминаем ссылку на объект
		var obj = $(this.el);

		// если кеш шаблона уже есть
		if (CACHE[3] != undefined)
		{
			// применим шаблон - передадим в шаблон 1 переменную (объект)
			var arg = {
				phoneNumber: widget.abonentName != '' ? widget.abonentName : widget.phoneNumber,
				callType: widget.callType,
				callPrice: widget.callPrice,
				avatar: widget.abonentAvatar,
				status: widget.abonentStatus
			};
			obj.html(CACHE[3](arg));			
			return;
		}
		
		// если кеша шаблона еще нет - асинхронно качаем шаблон
		$.ajax({
			url: 'js/templates/screen3.html',
			success: function(data) {
				// установим функцию шаблона
				var temp = _.template($(data).html());
				// шаблон в кеш
				CACHE[3] = temp;
				// применим шаблон - передадим в шаблон 1 переменную (объект)
				var arg = {
					phoneNumber: widget.abonentName != '' ? widget.abonentName : widget.phoneNumber,
					callType: widget.callType,
					callPrice: widget.callPrice,
					avatar: widget.abonentAvatar,
					status: widget.abonentStatus
				};
				obj.html(CACHE[3](arg));
			}
		});
	}	
});

//==============================================================================
//
// View пятого экрана виджета
//
//==============================================================================
var Screen4 = Backbone.View.extend({
	
	el: $("#widget-screen4"),
	
	//--------------------------------------------------------------------------
	// события с обработчиками
	//--------------------------------------------------------------------------
	events: {
		'click': 'ExtendButton',		
	},	
	
	ExtendButton: function(e) {

		if(e) e.preventDefault();
		
		// перемащаем в нужное место и скрываем блок
		var obj = $(this.el);
		obj.animate({
			top: '50%',
			left: '50%',
			'margin-top': '-40px',
			'margin-left': '-170px',
		},  { duration: 400, queue: false, complete: function() {obj.hide()} });
		// одновременно показываем модальный блок
		$('#widget-block2').show();
		$('#widget-block2').animate({
				opacity: 1,
			},
			{
				duration: 400,
				queue: false,
				complete: function() {
					// модальный блок появился - покажем четвертый экран
					$('#widget-screen3').show();
					// ставим номер экрана вручную, так как не используем функцию showScreen
					widget.CurrentScreenNo = 3;
					// восстановим прозрачность
					$('#widget-screen3').find('div.modal3').first().animate({
						opacity: 1}, 200);					
				}
			}
		);
		
		return false;
	},
	
	//--------------------------------------------------------------------------
	// служебные функции
	//--------------------------------------------------------------------------
	// показать экран
	show: function() {
		// рендерим каждый раз, так как могут передаваться новые данные,
		// например новый номер телефона и новая стоимость звонка
		this.render();
		// показываем экран
		$(this.el).show();
		// перемащаем в нужное место
		$(this.el).animate({			
			top: '100%',
			left: '100%',
			'margin-top': '-120px',
			'margin-left': '-380px',
		},  { duration: 400, queue: false });
		// одновременно скрываем модальный блок
		$('#widget-block2').animate({
				opacity: 0,
			},
			{
				duration: 400,
				queue: false,
				complete: function() {				
					$('#widget-screen3').hide();
					$('#widget-block2').hide();
				}
			}
		);
	},
	
	//--------------------------------------------------------------------------
	// отрисовка
	//--------------------------------------------------------------------------
	render: function () {		
		// запоминаем ссылку на объект
		var obj = $(this.el);
		
		// если кеш шаблона уже есть
		if (CACHE[4] != undefined)
		{
			// применим шаблон - передадим в шаблон 1 переменную (объект)
			var arg = {
				phoneNumber: widget.abonentName != '' ? widget.abonentName : widget.phoneNumber,
				callType: widget.callType,
				callPrice: widget.callPrice,
				mins: widget.Screens[3].Timer.mins,
				secs: widget.Screens[3].Timer.secs
			};								
			// сам рендеринг
			obj.html(CACHE[4](arg));

			return;
		}
		
		// кеша шаблона нет - асинхронно качаем шаблон
		$.ajax({
			url: 'js/templates/screen4.html',
			success: function(data) {
				// установим функцию шаблона
				var temp = _.template($(data).html());
				// шаблон в кеш
				CACHE[4] = temp;
				// применим шаблон - передадим в шаблон 1 переменную (объект)
				var arg = {
					phoneNumber: widget.abonentName != '' ? widget.abonentName : widget.phoneNumber,
					callType: widget.callType,
					callPrice: widget.callPrice,
					mins: widget.Screens[3].Timer.mins,
					secs: widget.Screens[3].Timer.secs
				};					
				// сам рендеринг
				obj.html(CACHE[4](arg));
			}
		});
	}	
});

//==============================================================================
//
// View виджета
//
//==============================================================================
var WidgetView = Backbone.View.extend({

	// вешаем на все body, так как нужно глобально ловить
	// клики и нажатия на клавиши
	el: 'body',

	// в конструкторе сразу грузим все картинки виджета
	initialize: function() {
		this.preloadImages(
			'img/caller/avatar.png',
			'img/caller/extend-button.png',
			'img/caller/screen3-buttons.png',
			'img/caller/stop-button.png',
			'img/caller/top-menu.png',
			'img/caller/loader.gif',
			'img/avatars/img.png'
		);
	},
	
	// все View наших экранов сразу храним в памяти
	Screens: [
		new Screen0(), // набор номера, история звонков (screen0.html)
		new Screen1(), // выбор тарифа для звонка (screen1.html)
		new Screen2(), // вызов абонента, соединение с ним (screen2.html)
		new Screen3(), // соединение установлено, панель (screen3.html)
		new Screen4()  // свернутая панель установленного соединения (screen4.html)
	],
	
	// текущий экран, который показан в виджете
	CurrentScreenNo: -1,
	
	// функция показывает экран с номером "num"
	showScreen: function(num) {
		// запомним номер текущего экрана
		this.CurrentScreenNo = num;
		// покажем его
		this.Screens[num].show();
	},
	
	//--------------------------------------------------------------------------
	// данные которые передаются между экранами внутри виджета
	//--------------------------------------------------------------------------
	phoneNumber: '', // номер телефона абонента, формат: +7(xxx) xxx-xx-xx
	callDirection: 'Outgoing', // направление звонка
	callType: 'Sendway', // тариф звонка
	callPrice: '', // стоимость звонка, формат: xxx.xx - VAL
	
	abonentAvatar: '', // путь до картинки аватара абонента
	abonentName: '', // наименование абонента в адресной книге
	abonentStatus: false, // статус абонента в адресной книге
	
	// функция получения стоимости звонка
	getPrice: function(callback) {
		
		// эмуляция асинхронности
		setTimeout(function() {
			// тут типа получили данные асинхронно
			var data = { price: 1.49, cur: "rub" };
			
			// вызвали колбак
			if (callback && typeof(callback) === "function") callback(data);
		}, 100);
	},
	
	// функция получения истории звонков
	getRecentCalls: function(callback) {
		
		// эмуляция асинхронности
		setTimeout(function() {
			// тут типа получили данные асинхронно
			var data = recentCalls.toJSON();
		
			// вызвали колбак
			if (callback && typeof(callback) === "function") callback(data);
		}, 100);
	},	

	//--------------------------------------------------------------------------
	// события виджета и их обработчики
	//--------------------------------------------------------------------------
	events: {
		'click div#button-phone': 'StartWidget',
		'click a': 'Links',
		'click': 'HideWidget',
		'keypress': 'KeyProxy'
	},
	
	// старт виджета - показывает/скрывает виджет
	StartWidget: function(e) {		
	
		e.preventDefault();
		
		// если у нас показан пятый экран - восстанавливаем четвертый :)
		if (this.CurrentScreenNo == 4)
		{
			this.Screens[4].ExtendButton(e);
			return;
		}
		
		var panel = $(this.el).find('div#widget-block');
		if (!panel.length) return;
		
		if (panel.is(':visible')) 
		{
			this.Screens[this.CurrentScreenNo].hide();
			this.CurrentScreenNo = -1;
		}
		else 
		{			
			this.showScreen(0);
			panel.show();			
		}
		return false;
	},

	// клик по ссылкам
	Links: function(e) {

		e.preventDefault();

		// получем URL запрашиваемой страницы
		var url = $(e.currentTarget).attr('href');

		// создаем новую запись в истории
		history.pushState({url:url}, null, url);

		// грузим страницу
		this.loadPage(url);

		return false;
	},

	// скрывает виджет при клике вне его области
	HideWidget: function(e) {
		
		// если первый или второй экран - плавно скрываем
		if (this.CurrentScreenNo == 0 || this.CurrentScreenNo == 1)
		{
			this.Screens[this.CurrentScreenNo].hide();
			this.CurrentScreenNo = -1;
			return true;
		}
		
		// если у нас показан четвертый экран - показываем пятый :)
		if (this.CurrentScreenNo == 3)
		{
			// раз дошли до сих пор, то 100% кликнули вне четвертого экрана
			// так как на четвертом экране стоит фильтр кликов e.stopPropagation();
			this.Screens[3].TopMenu(e);
			return true;
		}

		return true;
	},

	// перехват всех нажатий клавиш на документе	
	KeyProxy: function(e) {
		
		// перехват всех нажатий клавиш на первом экране
		if (this.CurrentScreenNo == 0)
		{
			// ссылки
			var obj = $(this.Screens[0].el);
			var input = obj.find('#input-phone-number');
			
			// если поле не в фокусе
			if (!input.is(':focus'))
			{				
				// пускаем только цифры, backspace и dlete
				if ((e.which >= 48 && e.which <= 57) || e.keyCode == 46 || e.keyCode == 8)
				{
					e.preventDefault();
					e.stopPropagation();
					// эмуляция нажатия клавиши в поле с номером				
					var D = $.Event("keydown", { which: e.which, keyCode: e.keyCode, charCode: e.charCode });
					var P = $.Event("keypress", { which: e.which, keyCode: e.keyCode, charCode: e.charCode });
					var U = $.Event("keyup", { which: e.which, keyCode: e.keyCode, charCode: e.charCode });
					input.trigger(D).trigger(P).trigger(U);
					return false;
				}
			}
			
			return true;
		}
	},

	//--------------------------------------------------------------------------
	// проигрывание музыки вместо разговора
	//--------------------------------------------------------------------------
	// объект для проигрывания музыки
	audio: null,
	// начать проигрывание музыки
	playAudio: function() {
		this.audio.play();
	},
	// остановить проигрывание музыки
	stopAudio: function() {
		this.audio.pause();
	},
	// музыка сама остановилась/закончилась
	event_StopAudio: function(e) {
		
		// если окно в свернутом состоянии - развернем его
		// потому что нет данных как закрывать виджет при свернутом окне
		if (this.CurrentScreenNo == 4)
		{
			this.Screens[4].ExtendButton(false);
		}

		// теперь можно выключать виджет через 700 мс
		var obj = this.Screens[3];
		setTimeout( function() {
			obj.StopButton(false);
		}, 700);
	},	

	//--------------------------------------------------------------------------
	// служебные функции
	//--------------------------------------------------------------------------
	// предварительная загрузка изображений
	preloadImages: function() {
		for (var i = 0; i < arguments.length; i++)
			new Image().src = arguments[i];
	},

	// динамическая загрузка страниц
	// так как всего две страницы "Главная" и "Пометки"
	// маршрутизацию я не делал
    loadPage: function(url) {

		// запомним ссылку
		var obj = $(this.el).find('div#content-block');

		// если загрузить нужно страницу с пометками
		if (url === '/notes.html')
		{
			$.ajax({
				url: '/pages' + url,
				cache: false,
				success: function(data) {					
					obj.html(data);
				}
			});
		}
		else
		// если такой URL не найден, то это главная страница - пустая
		if (url == '' || url == '/' || url == null || url == undefined)
		{
			$.ajax({
				url: '/pages/main.html',
				cache: false,
				success: function(data) {					
					obj.html(data);
				}
			});
		}
    }
});

//==============================================================================
//
// переменные приложения
//
//==============================================================================
// адресная книга
var addressBook = new AddressBookCollection([
	{
		"name": "Megan Fox",
		"phone": "+7 (800) 755-68-98",
		"avatar": "img.png",
		"Is_sendway": true,
		"online": true
	},
	{
		"name": "God",
		"phone": "+7 (000) 000-00-00",
		"online": true
	},
]);
// история звонков
var recentCalls = new RecentCallsCollection([
	{
		"phone": "+7 (800) 755-68-98",
		"date": "2016-04-01 12:00:00",
		"direction": "in"
	},
	{
		"phone": "+7 (913) 456-64-23",
		"date": "2016-04-04 15:30:00",
		"direction": "in"
	},
	{
		"phone": "+7 (983) 345-36-84",
		"date": "2016-04-07 17:45:00",
		"direction": "in"
	},
	{
		"phone": "+7 (345) 298-48-37",
		"date": "2016-04-07 17:45:00",
		"direction": "in"
	}
]);
// виджет
var widget = new WidgetView();

//==============================================================================
//
// HTML5 API History
//
//==============================================================================
// получим текущий URL из адресной строки браузера
var loc = window.location ||
	(event.originalEvent && event.originalEvent.location) ||
	document.location;
var thisURL = loc.pathname ? loc.pathname : '/';

// у нас всего две страницы, маршруты не нужны
var title = thisURL === '' || thisURL === '/' ? 'Home' : 'Notes';

// параметры для текущего состояния
// data, title, url
history.replaceState({url:thisURL}, title, thisURL);

// грузим страницу
widget.loadPage(thisURL);

// подпишемся на обработчик нажатий кнопок браузера назад/вперед 
$(window).bind('popstate', function(e) { widget.loadPage(history.state.url); });

}});