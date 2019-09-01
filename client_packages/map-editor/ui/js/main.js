Vue.component('recycle-scroller', VueVirtualScroller.RecycleScroller)

let app = new Vue({
  el: '#vue',
  data: {
    window: null,
    query: '',
    list: [],
    result: [],
    entities: {},
    selectedObj: {index: 0, obj: ''},
    isHoldingObject: false,
    crosshair: true,
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

  computed: {
    crosshairStyle() {
      return {
        opacity: this.crosshair ? 1 : 0,
        fill: this.isHoldingObject ? 'red' : 'skyblue'
      }
    }
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
      if (this.query.trim() === '')
        this.result = this.list
      else
        this.result = this.fuse.search(this.query.trim())
    },

    generateEntityName(ent,id) {
      return `${ent.type} ${ent.model? ent.model +' ':''}(${id})`
    },

    objectClick(i, obj) {
      if (this.selectedObj.index == i && this.selectedObj.obj == obj) {
        if (this.window == 'objects') {
          this.window = null
          this.selectedObj = {index: null, obj: ''}
          // start moving the viewed object in game world
          mp.trigger('me:createObject')
        }
      } else {
        this.selectedObj.index = i
        this.selectedObj.obj = obj
        if (this.window == 'objects')
          mp.trigger('me:viewObject', obj)

        if (this.window == 'entities')
          mp.trigger('me:selectEntity', app.entities[i].id)
      }
    },

    createMarker() {

    },

    windowOpen(win) {app.window = win},
    
    windowCancel() {
      if (app.window == 'entities')
        app.entities = {}
      // selected in new object list
      if (this.selectedObj != null) {
        mp.trigger('me:cancelObjectView')
      }
      app.window = null
      this.selectedObj = {index: null, obj: ''}
      mp.invoke('focus', false)
      this.crosshair = true
    },

    windowSave() {
      app.window = null
    }
  }
})

addEventListener('keydown', e=> {
  if (!app.window) return
  if (e.key == 'ArrowDown' || e.key == 'ArrowUp') {
    let arr, i
    if (app.window == 'objects')
      arr = app.result
    else return

    if (e.key == 'ArrowDown') {
      if (app.selectedObj.index < arr.length - 1)
        i = app.selectedObj.index + 1
      else return
    }
    if (e.key == 'ArrowUp') {
      if (app.selectedObj.index > 0)
        i = app.selectedObj.index - 1
      else return
    }
    if (app.window == 'objects')
      app.objectClick(i, arr[i].obj)
    
    let el = document.querySelector('.active')
    if (el) el.scrollIntoViewIfNeeded()

  } else if (e.key == 'Enter') {
    console.log('enter')
  }
})