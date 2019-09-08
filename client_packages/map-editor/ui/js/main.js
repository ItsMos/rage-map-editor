Vue.component('recycle-scroller', VueVirtualScroller.RecycleScroller)

let app = new Vue({
  el: '#vue',
  data: {
    window: null,
    query: '',
    objects: [],
    objectsResult: [],
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
    },
    map: {
      name: '',
      author: '',
      gamemode: '',
      desc: '',
      file: ''
    },
    fileExists: null,
    savedFile: '',
    mapList: []
  },

  watch: {
    'map.name': function (val) {
      if (this.savedFile) return
      let match = this.map.name.trim().replace(' ', '_').match(/[\w-_\[\]]+/g)
      if (match)
        this.map.file = match.join('_')
    },

    'map.file': function () {
      app.fileExists = null
    }
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
      this.objects = data
      this.objectsResult = this.objects
      let options = {
        shouldSort: true,
        threshold: 0.2,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['obj']
      }
      this.fuse = new Fuse(this.objects, options)
    },

    search() {
      if (this.query.trim() === '')
        this.objectsResult = this.objects
      else
        this.objectsResult = this.fuse.search(this.query.trim())
    },

    generateEntityName(ent,id) {
      let str = ''
      if (ent.type != 'object')
        str += ent.type + ' '
      if (ent.name)
        str += ent.name + ' '
      else if (ent.model)
        str += ent.model + ' '
      str += `(${id})`
      return str
    },

    objectClick(i, obj) {
      // double click
      if (this.selectedObj.index == i && this.selectedObj.obj == obj) {
        if (this.window == 'objects') {
          this.window = null
          // start moving the viewed object in game world
          mp.trigger('me:createObject')
        }

        if (this.window == 'openMap')
          app.openMap(this.selectedObj.obj)
        
        this.selectedObj = {index: null, obj: ''}

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
      mp.trigger('me:createMarker')
    },

    windowOpen(win) {app.window = win},
    
    windowCancel() {
      if (app.window == 'entities')
        app.entities = {}
      if (app.window == 'openMap')
        app.mapList = []
      // selected in new object list
      if (this.selectedObj.obj)
        mp.trigger('me:cancelObjectView')
      app.window = null
      this.selectedObj = {index: null, obj: ''}
      mp.invoke('focus', false)
      this.crosshair = true
    },

    windowSave() {
      if (app.window == 'save-as') {
        if (!app.map.file) return
        if (app.fileExists == null)
          mp.trigger('me:checkFileExists', this.map.file)
        else {
          // overwrite
          this.saveMap()
        }
        return
      }
      app.window = null
    },

    // called if file dont exist or overwrite
    saveMap() {
      mp.trigger('me:saveMap', app.map.file, app.map.name, app.map.author,
        app.map.gamemode, app.map.desc)
      app.savedFile = app.map.file
      app.fileExists = null
      app.window = null
      mp.invoke('focus', false)
      app.crosshair = true
    },

    quickSave() {
      if (app.savedFile == app.map.file && app.savedFile) {
        mp.trigger('me:saveMap', app.map.file, app.map.name, app.map.author,
        app.map.gamemode, app.map.desc)
      } else {
        // no map open or saved before
        alert('Use "Save As" first, or open a map')
      }
    },

    filterFileName(ev) {
      if (!ev.key.match(/[\w-_\[\]]/))
        return ev.preventDefault()
    },

    newMap() {
      app.entities = {}
      let props = ['name', 'author', 'gamemode', 'desc', 'file']
      props.forEach(prop => {
        app.map[prop] = ''
      })
      app.savedFile = ''
      mp.trigger('me:newMap')
      app.window = null
      mp.invoke('focus', false)
      app.crosshair = true
    },

    requestMaps: ()=> mp.trigger('me:getMaps'),
    reciveMaps(maps) {
      app.mapList = maps
      app.windowOpen('openMap')
    },

    openMap(map) {
      if (map == app.savedFile)
        return alert('map already open')
      mp.trigger('me:openMap', map)
      app.window = null
      mp.invoke('focus', false)
      app.crosshair = true
    }
  }
})

addEventListener('keydown', e=> {
  if (!app.window) return
  if (e.key == 'ArrowDown' || e.key == 'ArrowUp') {
    let arr, i
    if (app.window == 'objects')
      arr = app.objectsResult
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
    // console.log('enter')
  }
})

function isWriting() {
  if (document.activeElement.tagName == 'INPUT'
    || document.activeElement.tagName == 'TEXTAREA')
    return mp.trigger('me:isWriting', true)
  mp.trigger('me:isWriting', false)
}
addEventListener('focusin', isWriting)
addEventListener('focusout', isWriting)