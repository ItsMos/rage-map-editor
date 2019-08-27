
let app = new Vue({
  el: '#vue',
  data: {
    window: null,
    query: '',
    list: [],
    result: [],
    props: {
      objectModel: null,
      markerType: 0,
      markerSize: 1,
      color: [0,0,0,0],
      pos: {x:0, y:0, z:0},
      rot: {x:0, y:0, z:0}
    }
  },

  // for browser testing
  async mounted() {
    // let a = await fetch('http://127.0.0.1:8080/objects.json')
    // let json = await a.json()
    
    // let x = Object.keys(json).map(function(key) {
    //   return { obj: key}
    // })
    // this.updateObjectsList(x)
    
  },
  methods: {
    updateObjectsList(data) {
      this.list = data
      this.result = this.list
      let options = {
        shouldSort: true,
        threshold: 0.2,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['obj']
      }
      this.fuse = new Fuse(this.list, options)
    },

    search() {
      // this.st = Date.now()
      // console.log('starting search')

      if (this.query.trim() === '')
        this.result = this.list
      else
        this.result = this.fuse.search(this.query.trim())

      // let d = (Date.now() - this.st)/ 1000
      // console.log('Search done in '+ d)
    },

    viewObject(obj) {
      // mp.trigger('me:viewObject')
      mp.trigger('me:placeObject', obj)
    },

    newObjectPicked() {

    },

    createMarker() {

    },

    windowOpen(win) {
      app.window = win
    },
    
    windowCancel() {
      app.window = null
    },

    windowSave() {
      app.window = null
    }
  }
})