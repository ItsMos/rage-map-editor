let noclip = require('./map-editor/noclip')
let player = mp.players.local

function inFrontOf (pos, heading, dist) {
  heading *= Math.PI / 180
  pos.x += (dist * Math.sin(-heading))
  pos.y += (dist * Math.cos(-heading))
  return pos
}

let keysHex = {
  F2: 0x71,
  F4: 0x73
}
let keys = {
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40,
  PageUp: 33,
  PageDown: 34,
  E: 69,
  Q: 81,
  LCtrl: 17,
  Shift: 16
}

mp.keys.bind(keysHex.F2, true, function() {
  if (mp.gui.cursor.visible)
    mp.gui.cursor.show(false, false)
  else
    mp.gui.cursor.show(true, true)
})

let cef
// let objectInView
global.objectInView = null

let boxRender, boxMarker, motionRender;

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

// render function
function moveObject() {
  let sign = 0
  let zSign = 0
  let dist = 0.85
  if (mp.keys.isDown(keys.Up)) {
    // mp.game.graphics.drawText('upp', [0.5,0.5], {font: 1, center: true, color:[255,255,255,255], scale: [1,1]})
    sign = 1
  }
  if (mp.keys.isDown(keys.Down)) {
    sign = -1
    // mp.game.graphics.drawText('down', [0.5,0.5], {font: 1, center: true, color:[255,255,255,255], scale: [1,1]})
  }
  if (mp.keys.isDown(keys.PageUp))
    zSign = 1
  if (mp.keys.isDown(keys.PageDown))
    zSign = -1

  let pos = objectInView.position
  let camDir = noClipCamera.getDirection()
  camDir = new mp.Vector3(camDir.x * (sign * dist), camDir.y * (sign * dist), camDir.z)
  objectInView.position = new mp.Vector3(pos.x+camDir.x,pos.y+camDir.y, pos.z + (dist * zSign))
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
    // enable object movement
    motionRender = new mp.Event('render', moveObject)
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