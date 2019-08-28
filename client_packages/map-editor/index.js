let noclip = require('./map-editor/noclip')
let player = mp.players.local

function inFrontOf (pos, heading, dist) {
  heading *= Math.PI / 180
  pos.x += (dist * Math.sin(-heading))
  pos.y += (dist * Math.cos(-heading))
  return pos
}

let keys = {
  F2: 0x71,
  F4: 0x73
}
let keysASCII = {
  Q: 69,
  E: 81,
  LCtrl: 17,
  Shift: 16
}

mp.keys.bind(keys.F2, true, function() {
  if (mp.gui.cursor.visible)
    mp.gui.cursor.show(false, false)
  else
    mp.gui.cursor.show(true, true)
})

let cef
// let objectInView
global.objectInView = null

let boxRender
let boxMarker
function selectObject(obj) {
  obj = obj ? obj: objectInView
  mp.gui.cursor.visible = false
  // draw box
  if (boxMarker) boxMarker.destroy()
  if (boxRender) boxRender.destroy()
  let pos = obj.position
  let dim = mp.game.gameplay.getModelDimensions(obj.model)
  let min = new mp.Vector3(dim.min.x, dim.min.y, dim.min.z)
  let max = new mp.Vector3(dim.max.x, dim.max.y, dim.max.z)
  let size = max.subtract(min)

  boxMarker = mp.markers.new(0, new mp.Vector3(pos.x,pos.y,pos.z + size.z+1),1)

  boxRender = new mp.Event('render', ()=> {
    pos = obj.position
    boxMarker.position = new mp.Vector3(pos.x,pos.y,pos.z + size.z+1)

    let v1 = new mp.Vector3(pos.x, pos.y, pos.z)
    v1.x += (size.x/2)
    v1.y += (size.y/2)
    let v2 = new mp.Vector3(pos.x, pos.y, pos.z + size.z)
    v2.x -= (size.x/2)
    v2.y -= (size.y/2)
    mp.game.graphics.drawBox(v1.x,v1.y,v1.z, v2.x,v2.y,v2.z,0,0,255,50)
  })
}
function deselectObject() {
  boxRender.destroy()
  boxMarker.destroy()
  boxRender = boxMarker = null
}

mp.events.add({
  'me:start': ()=> {
    if (cef) return
    noclip.start()
    cef = mp.browsers.new('package://map-editor/ui/ui.html')
    let objectsList = require('./map-editor/objects').list
    objectsList = Object.keys(objectsList).map(function(key) {
      return { obj: key}
    })
    cef.execute(`app.updateObjectsList(${JSON.stringify(objectsList)})`)
    mp.game.ui.displayRadar(false)
    mp.gui.chat.push('Map editor started')
  },

  'me:stop': ()=> {
    if (cef) {
      cef.destroy()
      cef = null
    }
  }
})

// CEF Events
mp.events.add({
  'me:viewObject': object=>{
    let pos
    if (objectInView) {
      pos = objectInView.position
      objectInView.destroy()
    } else {
      pos = inFrontOf(noClipCamera.getCoord(), noClipCamera.getRot(2).z, 5)
      pos.z += noClipCamera.getDirection().z * 10
    }
    
    objectInView = mp.objects.new(mp.game.joaat(object), pos, {
      rotation: new mp.Vector3(0,0,0),
      dimension: player.dimension
    })
  },
  'me:createObject': ()=> {
    if (!objectInView) return
    // draw a box/light around the object and control it with keyboard
    selectObject()
  },
  'me:cancelObjectView': ()=> {
    if (objectInView) {
      objectInView.destroy()
      objectInView = null
    }
  },
  'me:createMarker': ()=>{},
  'me:placeObject': (object, rotation) => {
    let _pos = inFrontOf(noClipCamera.getCoord(), noClipCamera.getRot(2).z, 5)
    mp.objects.new(mp.game.joaat(object), _pos, {
      rotation: new mp.Vector3(0,0,0),
      dimension: player.dimension
    })
  }
})

setTimeout(() => {
  mp.events.call('me:start')
}, 2000)