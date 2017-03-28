spa.shell = (function () {
    // Переменные в области видимости модуля
    var
        configMap = {
            anchor_schema_map: {
                chat: {
                    open: true,
                    closed: true
                }
            },
            main_html: String()
            + '<div class="spa-shell-head">'
            + '<div class="spa-shell-head-logo"></div>'
            + '<div class="spa-shell-head-acct"></div>'
            + '<div class="spa-shell-head-search"></div>'
            + '</div>'
            + '<div class="spa-shell-main">'
            + '<div class="spa-shell-main-nav"></div>'
            + '<div class="spa-shell-main-content"></div>'
            + '</div>'
            + '<div class="spa-shell-foot"></div>'
            + '<div class="spa-shell-chat"></div>'
            + '<div class="spa-shell-modal"></div>',

            chat_extend_time: 1000,
            chat_retract_time: 300,
            chat_extend_height: 450,
            chat_retract_height: 15,
            chat_extended_title: 'Щёлкните, чтобы свернуть',
            chat_retracted_title: 'Щёлкните, чтобы раскрыть'
        },
        stateMap = {
            $container : null,
            anchor_map: {},
            is_chat_retracted: true
        },
        jqueryMap = {},
        copyAnchorMap, setJqueryMap, toggleChat, changeAnchorPart, onHashChange, onclickChat, initModule;

    // Конец переменных области видимости модуля

    // Начало служебных методов
    // Возвращает копию сохранённого хэша якорей; минимизация издержек
    copyAnchorMap = function () {
        return $.extend(true, {}, stateMap.anchor_map);
    };
    // Конец служебных методов

    // Начало методов DOM
    setJqueryMap = function () {
        var $container = stateMap.$container;
        jqueryMap = {
            $container: $container,
            $chat: $container.find('.spa-shell-chat')
        };
    };

    // Состояние устанавливает stateMap.is_chat_retracted
    // * true - окно свёрнуто
    // * false - окно раскрыто
    toggleChat = function (do_extend, callback) {
        var
            px_chat_ht = jqueryMap.$chat.height(),
            is_open = px_chat_ht === configMap.chat_extend_height,
            is_closed = px_chat_ht === configMap.chat_retract_height,
            is_sliding = !is_open && !is_closed;

        // Во избежании гонки
        if(is_sliding) { return false; }

        //Начало раскрытия окна чата
        if(do_extend) {
            jqueryMap.$chat.animate(
                {height: configMap.chat_extend_height},
                configMap.chat_extend_time,
                function () {
                    jqueryMap.$chat.attr('title', configMap.chat_extended_title);
                    stateMap.is_chat_retracted = false;
                    if(callback){ callback(jqueryMap.$chat);}
                }
            );
            return true;
        }

        // Начало сворачивания окна чата
        jqueryMap.$chat.animate(
            {height: configMap.chat_retract_height},
            configMap.chat_retract_time,
            function () {
                jqueryMap.$chat.attr('title', configMap.chat_retracted_title);
                stateMap.is_chat_retracted = true;
                if(callback) {callback(jqueryMap.$chat);}
            }
        );
        return true;
    };

    changeAnchorPart = function (arg_map) {
        var
            anchor_map_revise = copyAnchorMap(),
            bool_return = true,
            key_name, key_name_dep;

        // Начало объединения изменений в хэше якорей
        KEYVAL:
        for(key_name in arg_map) {
            if(arg_map.hasOwnProperty(key_name)) {
                // Пропустить зависимые ключи
                if(key_name.indexOf('_') === 0) {
                    continue KEYVAL;
                }

                // Обновить значение независимого ключа
                anchor_map_revise[key_name] = arg_map[key_name];

                // Обновить соответствующий зависимый ключ
                key_name_dep = '_' + key_name;

                if(arg_map[key_name_dep]) {
                    anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
                } else {
                    delete anchor_map_revise[key_name_dep];
                    delete anchor_map_revise['_s' + key_name_dep];
                }
            }
        }

        // Начало попытки обновления URI; в случае ошибки восстановить исходное состояние
        try {
            $.uriAnchor.setAnchor(anchor_map_revise);
        }
        catch(error) {
            // Восстановить исходное состояние в URI
            $.uriAnchor.setAnchor(stateMap.anchor_map, null, true);
            bool_return = false;
        }
        // Конец попытки обновления URI

        return bool_return;
    };

    // Конец методов DOM

    // Начало обработчиков событий
    onHashChange = function (event) {
        var
            anchor_map_previous = copyAnchorMap,
            anchor_map_proposed,
            _s_chat_previous, _s_chat_proposed;

        // Пытаемся разобрать якорь
        try {
            anchor_map_proposed = $.uriAnchor.makeAnchorMap();
        }
        catch (error) {
            $.uriAnchor.setAnchor(anchor_map_previous, null, true);
            return false;
        }

        stateMap.anchor_map = anchor_map_proposed;

        // Вспомогательные переменные
        _s_chat_previous = anchor_map_previous._s_chat;
        _s_chat_proposed = anchor_map_proposed._s_chat;

        // Начало изменения компонента Chat
        if(!anchor_map_previous || _s_chat_previous !== _s_chat_proposed) {
            _s_chat_proposed = anchor_map_proposed.chat;

            switch (_s_chat_proposed) {
                case 'open':
                    toggleChat(true);
                    break;
                case 'closed':
                    toggleChat(false);
                    break;
                default:
                    toggleChat(false);
                    delete anchor_map_proposed.chat;
                    $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
            }
        }
        // Конец изменения компонента Chat

        return false;
    };

    onclickChat = function (event) {
        changeAnchorPart({
            chat: (stateMap.is_chat_retracted ? 'open' : 'closed')
        });

        return false;
    };
    // Конец обработчиков событий

    // Начало открытых методов
    initModule = function ($container) {
        // Загрузить HTML и кэшировать коллекции jQuery
        stateMap.$container = $container;
        $container.html(configMap.main_html);
        setJqueryMap();

        // Инициализировать окно чата и привязать обработчик щелчка
        stateMap.is_chat_retracted = true;
        jqueryMap.$chat
            .attr('title', configMap.chat_retracted_title)
            .click(onclickChat);

        $.uriAnchor.configModule({
            schema_map: configMap.anchor_schema_map
        });

        // Обрабатываем события изменения якоря в URI
        $(window)
            .bind('hashchange', onHashChange)
            .trigger('hashchange');
    };

    return {initModule: initModule};
    // Конец открытых методов

}());