
let app = new Vue({
  el: '#vue',
  data: {
    query: '',
    debouncedQuery: '',
    list: {}
  },
  methods: {
    search() {
      app.debouncedQuery = app.query.trim()
    },

    viewObject(obj) {
      // mp.trigger('me:viewObject')
      mp.trigger('me:createObject', obj)
    }
  }
})