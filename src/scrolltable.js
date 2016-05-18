/**
 * # ScrollTable
 *
 * 滚动分页
 *
 * 由于业务不一样，数据接口与参数经常不一致，所以要配置format与formatAjaxData参数
 */
!(function() {
    var THRESHOLD = 200,
        SCROLL_EVENT = 'scroll',
        EVENT_NAME = 'scroll resize'

    var _window = window,
        $ = _window.Zepto || _window.jQuery

    //是否在视窗下面
    var belowthefold = function(element) {
        var fold = _window.innerHeight + _window.scrollY

        return fold <= $(element).offset().top - THRESHOLD
    }

    //是否可见
    var isVisible = function(element) {
        return !(element.offsetWidth <= 0 && element.offsetHeight <= 0)
    }

    /**
     * ## ScrollTable Constructor
     *
     * ScrollTable 类
     *
     * 使用方法：
     * ```js
     *
     * new ScrollTable()
     *
     * ```
     */
    function ScrollTable(element, options) {
        var self = this

        self.options = $.extend({}, ScrollTable.prototype.defaults, options || {})

        self.$element = $(element)

        self.$list = $(options.listSelector)

        self.$loading = $(options.loadingTemplate).appendTo(self.$element)

        if (!self.$loading.length) return

        self.page = self.options.defaultPage

        function handler() {
            !belowthefold(self.$loading) && isVisible(self.$loading[0]) && self.load()
        }

        self.$container = $(_window).on(EVENT_NAME, handler)

        handler()
    }


    (function() {
        /**
         * ## defaults
         *
         * `defaults`默认配置项。
         *
         * 配置项说明：
         *
         * * `url`: url地址
         *
         * * `type`: 请求类型
         *
         * * `dataType`: 数据类型
         *
         * * `listSelector`: 列表选择器
         *
         * * `itemSelector`: item选择器，用于删除
         *
         * * `loadingTemplate`: loading 模板
         *
         * * `noDataTemplate`: 无数据模板
         *
         * * `completedTempalte`: 数据全部加载完成以后模板
         *
         * * `template`: item模板
         *
         * * `success`: 成功回调函数
         *
         * * `error`: 失败回调函数
         *
         * * `defaultPage`: 默认页数
         *
         * * `pageSize`: 页面大小
         *
         * * `countKey`: 总数的key
         *
         * * `resultKey`: 数据结果的key
         *
         * * `format`: 格式化后端数据方法，由于每个请求过来的数据可能不一致，所以需要手动格式化。
         *
         * * `formatAjaxData`: 格式化Ajax请求参数，由于每个请求发送的数据格式可能不一致，所以需要手动格式化。
         */
        this.defaults = {
            url: '',
            type: 'get',
            dataType: 'jsonp',
            listSelector: 'ul',
            itemSelector: '.J_scrollTable',
            loadingTemplate: '',
            noDataTemplate: '',
            completedTempalte: '',
            template: '',
            success: null,
            error: null,
            defaultPage: 0,
            pageSize: 10,
            countKey: 'count',
            resultKey: 'result',
            format: function(data) {
                return data
            },
            formatAjaxData: function(data) {
                return data
            }
        }

        this.page = 0
        this.pages = null
        this.data = []

        //获取页数
        this.getPages = function(total, pageSize) {
            return Math.ceil(total / pageSize)
        }

        /**
         * ## refresh
         *
         * 重新刷新table
         *
         * @return {instance} 当前实例
         */
        this.refresh = function() {
            var $complete,$nodata

            this.$list.html('')

            this.$loading.show()
            $complete && $complete.remove()
            $nodata && $nodata.remove()

            this.completed = false
            this.page = 0
            this.pages = null
            this.data = []

            this.load()
            return this
        }

        this.loaded = true

        /**
         * ## load
         *
         * 加载下一页数据
         *
         * @return {instance} 当前实例
         */
        this.load = function() {
            var self = this,
                options = this.options,
                page = self.page + 1

            //如果加载图片被隐藏，或者加载已完成则不进行加载
            if (self.completed || !self.loaded) {
                return self
            }

            self.page = page
            self.loaded = false

            if (self.pages == null || self.page <= self.pages) {

                self.getData({
                    page: self.page,
                    pagesize: options.pageSize
                }, function(data) {
                    self.loaded = true
                    data = options.format ? options.format(data) : data

                    //如果是第一页且无数据
                    if (!data[options.countKey] && self.page == 1) {
                        self.setNoDataStatus()
                        return self
                    }

                    //分页数值计算一次
                    self.pages == null && (self.pages = self.getPages(data[options.countKey] || 0, options.pageSize))

                    self.append(data[options.resultKey])

                    //判断数据是否加载完成
                    //有可能pages == 0 page == 1
                    self.page >= self.pages ? self.setCompletedStatus() : self.$container.trigger(SCROLL_EVENT)
                })
            } else {
                self.setCompletedStatus()
            }
            return self
        }

        this.setCompletedStatus = function() {
            //加载完成
            var $nodata = this.$nodata

            this.$loading.hide()
            $nodata && $nodata.remove()

            this.$complete = $(this.options.completedTempalte).appendTo(this.$element)

            this.completed = true
            return this
        }

        this.setNoDataStatus = function() {
            //没有数据
            var $complete = this.$complete

            this.$loading.hide()
            $complete && $complete.remove()

            this.$nodata = $(this.options.noDataTemplate).appendTo(this.$element)

            this.completed = true
            return this
        }

        function getRenderHtml(scrolltable, data) {
            var length, html = '',
                tpl = scrolltable.options.template

            if (data && (length = data.length)) {
                for (var i = 0; i < length; i++) {
                    html += tpl({
                        data: data[i]
                    })
                }
            }

            return html
        }

        /**
         * ## add/append
         *
         * 往后添加数据
         *
         * @param {Array} data   需要被添加的数据数组
         * @return {instance} 当前实例
         */
        this.add = this.append = function(appendData) {
            var html, $nodata = this.$nodata

            this.data = this.data.concat(appendData)

            this.data.length > 0 && $nodata && $nodata.remove()

            html = getRenderHtml(this,appendData)
            $(html).appendTo(this.$list)
            return this
        }

        /**
         * ## preappend
         *
         * 往前添加数据
         *
         * @param {Array} data   需要被添加的数据数组
         * @return {instance} 当前实例
         */
        this.preappend = function(appendData) {
            var html, $nodata = this.$nodata

            this.data = appendData.concat(this.data)

            this.data.length > 0 && $nodata && $nodata.remove()

            html = getRenderHtml(this,appendData)
            $(html).prependTo(this.$list)
            return this
        }

        function remove(scrolltable, i, id){
            var data = scrolltable.data,
                $complete = scrolltable.$complete

            data.splice(i, 1)

            scrolltable.$element.find(scrolltable.options.itemSelector + id).remove()

            if(data.length === 0){
                //数据队列为空，优先显示 nodata 模板
                $complete && $complete.remove()
                scrolltable.completed && scrolltable.setNoDataStatus()
            }
            scrolltable.$container.trigger(SCROLL_EVENT)
        }

        /**
         * ## remove
         *
         * 删除数据
         *
         * @param {Object} obj   被删除的数据
         * @return {instance} 当前实例
         */
        this.remove = function(obj) {
            var data = this.data, length

            if (data && (length = data.length)) {
                for (var i = 0; i < length; i++) {
                    if (data[i] === obj) {
                        remove(this, i, obj.id)
                        return this
                    }
                }
            }
            return this
        }

        /**
         * ## getById
         *
         * 通过ID获取数据
         *
         * @param {Number} id   需要被删除的数据ID
         * @param {String} name ID名称，有可能Id名称不一定是 ”id“
         * @return {Object}      筛选出来的数据
         */
        this.getById = function(id, name) {
            var name = name || 'id',
                param = {}

            param[name] = id

            return this.filter(param)[0]
        }

        /**
         * ## removeById
         *
         * 通过ID移除数据
         *
         * @param {Number} id   需要被删除的数据ID
         * @param {String} name ID名称，有可能Id名称不一定是 ”id“
         * @return {instance} 当前实例
         */
        this.removeById = function(id, name) {
            var data = this.data,
                length,
                name = name || 'id'

            if (data && (length = data.length)) {
                for (var i = 0; i < length; i++) {
                    if (data[i][name] == id) {
                        remove(this, i, id)
                        return this
                    }
                }
            }
            return this
        }

        /**
         * ## filter
         *
         * 筛选数据方法
         *
         * @param {Object} params 参数
         * @return {Array}         返回筛选出来的方法
         */
        this.filter = function(params) {
            var data = this.data, length, filter = []

            if (data && (length = data.length)) {
                for (var i = 0; i < length; i++) {
                    var d = data[i], flag = true
                    for (var name in params) {
                        if (params[name] != d[name]) {
                            flag = false
                            break
                        }
                    }
                    if (flag) {
                        filter.push(d)
                    }
                }
            }

            return filter
        }

        /**
         * ## getData
         *
         * 获取数据
         *
         * @param {Object} data    Ajax请求参数
         * @param {Function} success 请求成功以后回调
         * @param {Function} error   请求失败以后回调
         * @return {instance} 当前实例
         */
        this.getData = function(data, success, error) {
            var options = this.options
            $.ajax({
                url: options.url,
                type: options.type,
                dataType: options.dataType,
                cache: false,
                xhrFields: options.xhrFields,
                contentType: options.contentType,
                data: options.formatAjaxData ? options.formatAjaxData(data) : data,
                success: function() {
                    var callback = options.success

                    if (callback && callback.apply(this, arguments) === false) {

                    } else {
                        success && success.apply(this, arguments)
                    }
                },
                error: function() {
                    var callback = options.error

                    if (callback && callback.apply(this, arguments) === false) {

                    } else {
                        error && error.apply(this, arguments)
                    }

                }
            })
            return this
        }

    }).call(ScrollTable.prototype)

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ScrollTable
    } else if (typeof define === 'function') {
        define(function() {
            return ScrollTable
        })
    } else {
        _window.ScrollTable = ScrollTable
    }
})()
