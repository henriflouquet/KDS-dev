const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const JsonDB = require('node-json-db').JsonDB;
const Config = require('node-json-db/dist/lib/JsonDBConfig').Config
const moment = require('moment')
const PHE = require("print-html-element")
const schedule = require('node-schedule');

const db = new JsonDB(new Config("myKitchenDisplayDataBase", true, true, '/'))

// let devicesPerZones = db.getData("/devicesPerZones") || {}
let devicesPerZones = {}
let pendingOrders = {}
// let pendingOrders = db.getData("/pendingOrders") || {}
let finishedOrders =  db.getData("/finishedOrders") || {}
let periodHistory = 1800
let caredOrdersSalle = db.getData("/caredOrdersSalle") || {}
let indexOrder = db.getData("/indexOrder") || 0

// PHE.printHtml('<h1>Let\'s print this h1</h1>')
if (Object.keys(pendingOrders).length === 0 && pendingOrders.constructor === Object) {
  db.push("/pendingOrders", {})
}

if (Object.keys(finishedOrders).length === 0 && finishedOrders.constructor === Object) {
  db.push("/finishedOrders", {})
}

if (Object.keys(caredOrdersSalle).length === 0 && caredOrdersSalle.constructor === Object) {
  db.push("/caredOrdersSalle", {})
}

if (Object.keys(devicesPerZones).length === 0 && devicesPerZones.constructor === Object) {
  db.push("/devicesPerZones", {})
}

if (indexOrder === 0) {
  db.push("/indexOrder", 0)
}

// console.log("devicesPerZones", devicesPerZones)


db.push("/pendingOrders", {})
db.push("/finishedOrders", {})
db.push("/caredOrdersSalle", {})
db.push("/indexOrder", 0)
// console.log("refreshed manually")

// try {
//   pendingOrders = db.getData("/pendingOrders");
// } catch(error) {  
//   console.error(error);
// }
// try {
//   caredOrdersSalle = db.getData("/caredOrdersSalle");
// } catch(error) {  
//   console.error(error);
// }

// try {
//   finishedOrders = db.getData("/finishedOrders");
// } catch(error) {  
//   console.error(error);
// }


// console.log("index", indexOrder)
// console.log("pendinggggggg", pendingOrders)
// try {
//   indexOrder = db.getData("/indexOrder");  
// } catch(error) {  
//   console.error(error);
// }

function refresh() {
  caredOrdersSalle = {}
  finishedOrders = {}
  pendingOrders = {}
  devicesPerZones = {}
  indexOrder = 0
  db.push("/devicesPerZones", {})
  db.push("/pendingOrders", {})
  db.push("/caredOrdersSalle", {})
  db.push("/finishedOrders", {})
  db.push("/indexOrder", 0)

  console.log("refreshed", pendingOrders)
}

// {productName: "frites", status: 0, handledBy: null, quantity: 1, zones: ["chaud"]}

function setOrderV2() {
   
    const order = orders[indexOrder]
    // console.log("ORDER", order)
    order.timestamp = new Date().getTime()
    pendingOrders[order.id] = order
    db.push("/pendingOrders", pendingOrders)
    if (indexOrder < 11) {
      indexOrder ++
    }
    
    db.push("/indexOrder", indexOrder)
    const items = order.items
    let zonesOrder = []
   items.forEach((item) => {  
      item.zones.forEach((zone) => {
        zonesOrder.push(zone.name)
      })  
      if (item.subItems) {
        item.subItems.forEach((subItem) => {
          subItem.zones.forEach((zone) => {
            zonesOrder.push(zone.name)
          })
        })
      }
      
    })
    zonesOrder = [...new Set(zonesOrder)]
 
    zonesOrder.forEach((zoneOrder) => {      
      Object.keys(devicesPerZones).forEach((zoneDevice) => {        
        if (zoneOrder == zoneDevice) {          
          devicesPerZones[zoneDevice].forEach((device)=> {            
            io.to(device).emit('action', {type:'UPDATE_ORDER', payload: order})
            io.to(device).emit('ring')          
          })          
        }
      })      
    })  
}


function cleanFinishedOrders(zoneDevice, socket) {
  
    let newFinished = {}
    if (Object.keys(finishedOrders).length > 0) {    
      Object.keys(finishedOrders).forEach((key) => {
        const endTime = moment(finishedOrders[key].endTime) 
        const period = moment().diff(endTime, 'seconds')
        if (period < periodHistory) {
          newFinished[key] = finishedOrders[key]
        }
      })
    }
    if (socket && zoneDevice && zoneDevice != "salle") {
      
      socket.emit('action', {type:'SET_FINISHED_ORDERS', payload: newFinished})
      
    }
    Object.keys(devicesPerZones).forEach((zone) => {
      if (zone != "salle") {
        devicesPerZones[zone].forEach((device) => {
          io.to(device).emit('action', {type:'SET_FINISHED_ORDERS', payload: newFinished}) 
        })
      }
    })   
}

setInterval(() => {          
  new cleanFinishedOrders()
}, 6000)

schedule.scheduleJob({hour: 7, minute: 00}, function(){
 new synchronizePending()
});

function synchronizePending() {
  caredOrdersSalle = {}
  db.push("/caredOrdersSalle", caredOrdersSalle)
  if (devicesPerZones["salle"]) {
    devicesPerZones["salle"].forEach((device) => {
      io.to(device).emit('action', {type:'CLEAN_CARED_ORDERS'})
    })
  } 

}


function takeOrderV2(order, zoneOrder, ip) { 
  console.log("ORDERRRR", order)
    const deviceZone = zoneOrder.name
    const orderId = order.id
    const notCared = (item) => {

      let hasCared = item.zones.some((zone) => zone.status != 0)
      // console.log("order", order)
      // console.log("item?",  itemNotCared)
      let subItemHasCared = false
      if (item.subItems) {
        for (let i = 0; i < item.subItems.length; i++) {
        
          if (item.subItems[i].zones.some((zone) => zone.status != 0))  {
            subItemHasCared = item.subItems[i].zones.some((zone) => zone.status != 0)
            if (subItemHasCared) {
              break
            }
            
          }     
        } 
      }
      
      if (!hasCared && !subItemHasCared) {
        return true
      } else {
        return false
      }
        

      // return notCared
      
    }
    
    if (pendingOrders[orderId].items.every(notCared)) {
      
      // émettre pris en charge en salle
      const now = new Date().getTime()
      careTimeObj = {}
      careTimeObj[deviceZone] = now
      careTimeObj.firstCare = now
      order.careTime = careTimeObj
      order.status = 1
      pendingOrders[orderId] = order
      
      db.push("/pendingOrders", pendingOrders)
      caredOrdersSalle[orderId] = order
      db.push("/caredOrdersSalle", caredOrdersSalle)

      // if (devicesPerZones["salle"]){
      //   devicesPerZones["salle"].forEach((device)=> {            
      //     io.to(device).emit('action', {type:'UPDATE_CARED_ORDERS', payload: order})          
      //   })
      // }      

      Object.keys(devicesPerZones).forEach((zone) => {
        devicesPerZones[zone].forEach((device, i) => {    
          io.to(device).emit('action', {type:'UPDATE_ORDER', payload: order}) 
          
          if (zone === "salle") {
            io.to(device).emit('action', {type:'UPDATE_CARED_ORDERS', payload: order})
          }
             
        })
      }) 
      
    } else {
      const newOrder = pendingOrders[order.id]
      
      const now = new Date().getTime() 
      const careTimeObj = newOrder.careTime    
      careTimeObj[deviceZone] = now
      newOrder.careTime = careTimeObj
      // console.log("care", newOrder.careTime)
      pendingOrders[orderId] = newOrder
      // db.push("/pendingOrders", pendingOrders)
    }

    let truthOrder = pendingOrders[orderId]  
    if (zoneOrder.status === 0) {
     const updatedItems = []
      truthOrder.items.forEach((item) => {  
        if (item.subItems) {
          const updatedSubItems = []
          item.subItems.forEach((subItem) => {
            const newZonesSub = subItem.zones.map((zone) => {
              if (zone.name == deviceZone) {
                zone.status = 1
                return zone
              } else {
                return zone
              }
            })
            subItem.zones = newZonesSub
            updatedSubItems.push(subItem)
          })
          item.subItems = updatedSubItems
        }      
        
        const newZones = item.zones.map((zone) => {
          if (zone.name == deviceZone) {
            zone.status = 1
            return zone
          } else {
            return zone
          }
        })
        item.zones = newZones
        updatedItems.push(item)
      })     
      truthOrder.items = updatedItems
      pendingOrders[orderId] = truthOrder
      db.push("/pendingOrders", pendingOrders)
      devicesPerZones[deviceZone].forEach((device)=> {   
        io.to(device).emit('action', {type:'UPDATE_TIMESTATUS', payload: {[truthOrder.id]: 0}})          
        io.to(device).emit('action', {type:'UPDATE_ORDER', payload: truthOrder}) 
                  
      })      
    }
}

function deleteStandBy(order) {

  delete pendingOrders[order.id]      
  db.push("/pendingOrders", pendingOrders)

}

function printFunction(order) {
  console.log("printed")
}

function endOrderV2(order, zoneOrder, ip, isSortie, socket, print) {
  
  const deviceZone = zoneOrder.name
  const orderId = order.id
  let otherDone = true
  let truthOrder = pendingOrders[orderId]
  
  if (!truthOrder && !order.recalled) {
    
    return
  } 
  
  
  if (zoneOrder.status === 1) {
    const updatedItems = []
     truthOrder.items.forEach((item) => {
       if (item.subItems) {
        const updatedSubItems = []
        item.subItems.forEach((subItem) => {
          const newZonesSub = subItem.zones.map((zone) => {
            if (zone.name == deviceZone || isSortie === true) {
              zone.status = 2
              return zone
            } else {
              if (zone.status != 2) {
                otherDone = false
              }
              return zone
            }
          })
          subItem.zones = newZonesSub
          updatedSubItems.push(subItem)
        })
        item.subItems = updatedSubItems
       }
       
       const newZones = item.zones.map((zone) => {
         if (zone.name == deviceZone || isSortie === true) {
           zone.status = 2
           return zone
         } else {
            if (zone.status != 2) {
              otherDone = false
            }
            return zone
         }
       })
       item.zones = newZones
       updatedItems.push(item)
       
     })    
     
     
     truthOrder.items = updatedItems

    socket.emit('action', {type:'REMOVE_TIMESTATUS', payload: orderId})
    if (otherDone || isSortie === true) {

      if (print === true) {
       printFunction(order)
      }

      // envoyer en salle comme terminé
      const now = new Date().getTime()
      truthOrder.endTime = now
      truthOrder.status = 2
      if (devicesPerZones["salle"]) {
        devicesPerZones["salle"].forEach((device)=> {                   
          io.to(device).emit('action', {type:'UPDATE_ORDER_SALLE', payload: truthOrder, received: true})
          io.to(device).emit('ring')
          io.to(device).emit('action', {type:'REMOVE_CARED_ORDER', payload: truthOrder})            
        })
      }
      
      // enlever des pending et des écrans des zones
      delete pendingOrders[orderId]
      delete caredOrdersSalle[orderId]
      finishedOrders[orderId] = truthOrder
      // console.log("finished", finishedOrders)
      db.push("/pendingOrders", pendingOrders)
      db.push("/finishedOrders", finishedOrders)

      if (isSortie === true) {
        const zones = []
        
        order.items.forEach((item) => {
            item.zones.forEach((zone) => {
              
                if (!zones.includes(zone.name)) {
                    zones.push(zone.name)
                } 
            })
            
            if (item.subItems) {
                item.subItems.forEach((subItem) => {
                    subItem.zones.forEach((zoneSub) => {
                      // console.log("zoneSub", zoneSub)
                        if (!zones.includes(zoneSub.name)) {
                            zones.push(zoneSub.name)
                        } 
                    })
                })
                
            }
        })
        

        zones.forEach((zone) => {
          if (devicesPerZones[zone]) {
            devicesPerZones[zone].forEach((device)=> {  
                       
              io.to(device).emit('action', {type:'REMOVE_ORDER', payload: truthOrder})          
            })
          }
           
        })        
      } else {

        

        devicesPerZones[deviceZone].forEach((device)=> {            
          io.to(device).emit('action', {type:'REMOVE_ORDER', payload: truthOrder})          
        })
      }
      
      
       
      Object.keys(devicesPerZones).forEach((zone) => {
        if (zone != "salle") {
          devicesPerZones[zone].forEach((device)=> { 
            truthOrder.otherDone = true     
            // io.to(device).emit('action', {type:'UPDATE_ORDER', payload: truthOrder})     
            socket.emit('action', {type:'UPDATE_FINISHED_ORDERS', payload: truthOrder})          
          }) 
        }
      
      })
      
    } else {
      truthOrder.items = updatedItems
      pendingOrders[orderId] = truthOrder
      db.push("/pendingOrders", pendingOrders)
      devicesPerZones[deviceZone].forEach((device)=> {            
        io.to(device).emit('action', {type:'REMOVE_ORDER', payload: truthOrder})          
      })
      
      Object.keys(devicesPerZones).forEach((zone) => {
        if (zone != "salle" && zone != deviceZone) {
          devicesPerZones[zone].forEach((device)=> { 
            // truthOrder.otherDone = true     
            io.to(device).emit('action', {type:'UPDATE_ORDER', payload: truthOrder})     
                     
          }) 
        }
      
      })
    }
  }
}

function populateOrdersV2(zoneDevice, socket) {
  // const match = (item, zoneFunc) => {
  //   const zoneDevice = zoneArg ? zoneArg : zoneFunc
  //   let shouldSend = false
  //     if (item.zones.some((zone) => (zone.status != 2) && (zone.name == zoneDevice))) {
  //       shouldSend = true
  //       return shouldSend
  //     }
  //     for (let i = 0; i < item.subItems.length; i++) {
  //       if (item.subItems[i].zones.some((zone) => (zone.status != 2) && (zone.name == zoneDevice)))  {
  //         shouldSend = true
  //         return shouldSend
  //         break
  //       }     
  //     } 
  //     return shouldSend
  // }


  // if (!zoneDevice) {
  //   Object.keys(devicesPerZones).forEach((zone) => {
  //     if (zone != "salle") {
  //       if (pendingOrders[orderId].items.some((item, zone) => match(item, zone))) {
  //         devicesPerZones[zone].forEach((device)=> {            
  //           io.to(device).emit('action', {type:'UPDATE_ORDER', payload: pendingOrders[orderId]})         
  //         })
  //       }          
  //     }
  //   })      
  // } else 
  if (zoneDevice != "salle") {  
    const match = (item) => {
      // console.log("item", item)
      let shouldSend = false
        if (item.zones.some((zone) => (zone.status != 2) && (zone.name == zoneDevice))) {
          shouldSend = true
          return shouldSend
        }
        if (item.subItems) {
          for (let i = 0; i < item.subItems.length; i++) {
            if (item.subItems[i].zones.some((zone) => (zone.status != 2) && (zone.name == zoneDevice)))  {
              shouldSend = true
              return shouldSend
              break
            }     
          } 
        }
        
        return shouldSend
    }   
    
    Object.keys(pendingOrders).forEach((orderId) => {
      if (pendingOrders[orderId].items.some(match)) {
        
        socket.emit('action', {type:'UPDATE_ORDER', payload: pendingOrders[orderId]})  
      }      
    }) 
  } else {
    Object.keys(finishedOrders).forEach((orderId) => { 
      // console.log("in emit", finishedOrders[orderId])    
       socket.emit('action', {type:'UPDATE_ORDER_SALLE', payload: finishedOrders[orderId]})          
     }) 
    Object.keys(caredOrdersSalle).forEach((orderId) => {     
      socket.emit('action', {type:'UPDATE_CARED_ORDERS', payload: caredOrdersSalle[orderId]})          
    })
  }
  
  // Object.keys(finishedOrders).forEach((orderId) => {

  // }) 
}

function transmitOrderV1(order) {
  // console.log("in server func", order)
  const now = new Date().getTime()
  order.endTime = now
  if (devicesPerZones["salle"]) {
    devicesPerZones["salle"].forEach((device)=> {                   
      io.to(device).emit('action', {type:'UPDATE_ORDER_SALLE', payload: order, received: true})
      io.to(device).emit('ring')                 
    })
  }
}

function recallOrder(order, zones, socket) {
  
  order.status = 1
  
  const updatedItems = []
     order.items.forEach((item) => {
       if (item.subItems) {
        const updatedSubItems = []
        item.subItems.forEach((subItem) => {
          const newZonesSub = subItem.zones.map((zoneSub) => {
            if (zones.includes(zoneSub.name)) {
              zoneSub.status = 1
              return zoneSub
            } else {              
              return zoneSub
            }
          })
          subItem.zones = newZonesSub
          updatedSubItems.push(subItem)
        })
        item.subItems = updatedSubItems
       }
       
       const newZones = item.zones.map((zoneItem) => {
         if (zones.includes(zoneItem.name)) {
           zoneItem.status = 1
           return zoneItem
         } else {
            
            return zoneItem
         }
       })
       item.zones = newZones
       updatedItems.push(item)
       
     })    
     
     const newOrder = {...order}
     newOrder.items = updatedItems
  
  order.recalled = {status: true, timestamp: new Date().getTime()}
  
  delete finishedOrders[order.id]
  pendingOrders[order.id] = order
  db.push("/pendingOrders", pendingOrders)
  db.push("/finishedOrders", finishedOrders)

  zones.forEach((zone) => {
    if (devicesPerZones[zone]) {
      devicesPerZones[zone].forEach((device)=> {            
        io.to(device).emit('action', {type:'UPDATE_ORDER', payload: order})           
      })
    }
    
  })
  
  
  new cleanFinishedOrders
}


function transmitOrderAlt(order) {
  
  const now = new Date().getTime()
  order.endTime = now
  if (devicesPerZones["salle"]) {
    devicesPerZones["salle"].forEach((device)=> {                   
      io.to(device).emit('action', {type:'UPDATE_ORDER_SALLE', payload: order, received: true})
      io.to(device).emit('ring')                
    })
  }
}


io.on('connection', function(socket){
  // console.log("Socket connected: " + socket.id);
  socket.emit("askForZone")
  socket.on('action', (action) => {
    if(action.type === 'server/sendZone'){
      // console.log("devicesperZOnes", devicesPerZones)
      const zone = action.payload      
      
      const array = devicesPerZones[zone] || []
      array.push(socket.id)
      
      devicesPerZones[zone] = array
      db.push("/devicesPerZones", devicesPerZones)
      // console.log("devicesperZOnes", devicesPerZones)
      // console.log("length pend", Object.keys(pendingOrders).length)
      // console.log("length fin", Object.keys(finishedOrders).length)
      // console.log(devicesPerZones)
      if (Object.keys(pendingOrders).length > 0 || Object.keys(finishedOrders).length > 0) {
        // console.log("about to populate")
        new populateOrdersV2(zone, socket)
      }     
        new cleanFinishedOrders(zone, socket)   
    } else if (action.type === 'server/sendSettingOrderHistory') {
      periodHistory = action.payload
    } else if (action.type === 'server/setOrderV2'){ 
      // console.log("trigger")     
      new setOrderV2
    } else if (action.type === 'server/takeOrderV2'){      
      new takeOrderV2(action.order, action.zoneOrder, action.ip)
    } else if (action.type === 'server/endOrderV2'){      
      new endOrderV2(action.order, action.zoneOrder, action.ip, action.isSortie, socket, action.print)
    } else if (action.type === 'server/sendOrderV1'){            
      new transmitOrderV1(action.payload)
    } else if (action.type === 'server/refresh'){            
      new refresh
    } else if (action.type === 'server/recallOrderV2'){  
      new recallOrder(action.order, action.zone, socket)
      
    } else if (action.type === 'server/sendOrderAlt'){ 
       
      new transmitOrderAlt(action.payload)
    } else if (action.type === 'server/removeFromPending') {
      new deleteStandBy(action.payload)
    }
        
  })

  socket.on('disconnect', (reason) => {
    
    // devicesPerZones = {}
    
    Object.keys(devicesPerZones).forEach((zone) => {
      devicesPerZones[zone].forEach((device, i) => {
        
        if (device == socket.id) {
          // console.log("socket", socket.id)
          let array = devicesPerZones[zone]
          array.splice(i, 1)
          
          devicesPerZones[zone] = array
          db.push("/devicesPerZones", devicesPerZones)
          
        }
      })
    })   

    // if (reason === 'io server disconnect') {
    //   // the disconnection was initiated by the server, you need to reconnect manually
    //   socket.connect();
    // }           
      
    })
    
})


http.listen(3000, function(){
  // console.log('listening on *:3000');
  // if (Object.keys(pendingOrders).length > 0 || Object.keys(finishedOrders).length > 0) {
  //   new populateOrdersV2()
  // }     
  //   new cleanFinishedOrders() 
});



const orders = [ 
  {
    id: "2",
    label_id: "002",
    origine: "UberEats",
    name: "Lakhdar",
    mode: "livraison",  
    comment: "hi",
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [
      { productName: "salade", comment: "test comment", quantity: 2, zones: [{name: "chaud", libellé: "test", status: 0, handledBy: null}], 
        subItems: [
          {subProductName:"tomates", quantity: 1, zones: [{name: "chaud", libellé: "test sub", status: 0, handledBy: null}]},
          {subProductName:"tomates 2", quantity: 1, zones: [{name: "chaud", status: 0, handledBy: null}]},
          {subProductName:"tomates 3", quantity: 1, zones: [{name: "chaud", status: 0, handledBy: null}]},
          // {subProductName:"tomates4", quantity: 1, zones: [{name: "chaud", status: 0, handledBy: null}]},
          // {subProductName:"tomates 5", quantity: 1, zones: [{name: "chaud", status: 0, handledBy: null}]},
          // {subProductName:"tomates 6", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
          // {subProductName:"tomates 7", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},    
          // {subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
          // {subProductName:"tomates 2", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
          // {subProductName:"tomates 3", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
          // {subProductName:"tomates4", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
          // {subProductName:"tomates 5", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},      
        ]
      },
      { productName: "tacos", comment: "second", quantity: 2, zones: [{name: "chaud", status: 0, handledBy: null}], 
        subItems: [
          {subProductName:"tomates", quantity: 1, zones: [{name: "chaud", status: 0, handledBy: null}]},
          {subProductName:"tomates 2", quantity: 1, zones: [{name: "chaud", status: 0, handledBy: null}]},
          {subProductName:"tomates 3", quantity: 1, zones: [{name: "chaud", status: 0, handledBy: null}]},
          // {subProductName:"tomates4", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
          // {subProductName:"tomates 5", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
                             
        ]
      },
      // { productName: "burger", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], 
      //   subItems: [
      //     {subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 2", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 3", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates4", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 5", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 6", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}                   
      //   ]
      // },
      // { productName: "pizza", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], 
      //   subItems: [
      //     {subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 2", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 3", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates4", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 5", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 6", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 7", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
                             
      //   ]
      // },
      // { productName: "steak", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], 
      //   subItems: [
      //     {subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 2", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 3", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates4", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 5", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 6", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]},
      //     {subProductName:"tomates 7", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}                      
      //   ]
      // },
    ]
  },
  {
    id: "3",
    label_id: "003",
    origine: "UberEats",
    name: "Caroline",
    mode: "surplace",   
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "steak", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], 
    subItems: [
      {subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}, {name: "chaud", status: 0, handledBy: null}]},
                         
    ]
  },
]
},
  {
    id: "4",
    label_id: "004",
    origine: "borne",
    name: "Lakhdar",
    mode: "livraison",  
    commande_status: "stand_by", 
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "salade", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}]
  },
  {
    id: "5",
    label_id: "005",
    origine: "borne",
    name: "Lakhdar",
    mode: "livraison",   
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "salade", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}]
  },
  {
    id: "6",
    label_id: "006",
    origine: "borne",
    name: "Lakhdar",
    mode: "livraison",   
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "salade", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}]
  },
  {
    id: "7",
    label_id: "007",
    origine: "borne",
    name: "Lakhdar",
    mode: "livraison",   
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "salade", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}]
  },
  {
    id: "8",
    label_id: "008",
    origine: "borne",
    name: "Lakhdar",
    mode: "livraison",   
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "salade", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}]
  },
  {
    id: "9",
    label_id: "9",
    origine: "borne",
    name: "Lakhdar",
    mode: "livraison",   
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "salade", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}]
  },
  {
    id: "10",
    label_id: "10",
    origine: "borne",
    name: "Lakhdar",
    mode: "livraison",   
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "salade", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}]
  },
  {
    id: "11",
    label_id: "11",
    origine: "borne",
    name: "Lakhdar",
    mode: "livraison",   
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "salade", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}]
  },
  {
    id: "12",
    label_id: "12",
    origine: "borne",
    name: "Lakhdar",
    mode: "livraison",   
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "salade", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}]
  },
  {
    id: "13",
    label_id: "13",
    origine: "borne",
    name: "Lakhdar",
    mode: "livraison",   
    status: 0,
    endTime: undefined,
    careTime: undefined,
    items: [{ productName: "salade", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}]
  },

]
  




// {
//   id: "3",
//   label_id: "003",
//   origine: "UberEats",
//   name: "Caroline",
//   mode: "surplace",   
//   status: 0,
//   endTime: undefined,
//   careTime: undefined,
//   items: [{ productName: "Taz", comment: "comment item", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "1", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"2 sub", comment: "comment sub", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}, {subProductName:"3 sub", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}, {subProductName:"4 sub", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}, { productName: "Hello", quantity: 2, zones: [{name: "chaud", status: 0, handledBy: null}]}]
// },

// {
//   id: "1",
//   label_id: "001",
//   origine: "caisse",
//   name: "Julien",
//   mode: "surplace",   
//   status: 0,
//   endTime: undefined,
//   careTime: undefined,
//   items: [{ productName: "1", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "2", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "3", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "4", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "5", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}]
// },


    // items: [{ productName: "Taz", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "1", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}], subItems: [{subProductName:"2 sub", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}, {subProductName:"3 sub", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}, {subProductName:"4 sub", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}]}, { productName: "Hello", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "Hello 4", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "Hello 3", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "Hello 2", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}]


    // {
    //   id: "1A",
    //   label_id: "001",
    //   origine: "caisse",
    //   name: "Julien",
    //   mode: "surplace",   
    //   status: -1,
    //   endTime: undefined,
    //   careTime: undefined,
    //   items: [{ productName: "1", comment: "hi", subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}], quantity: 2, zones: [{name: "chaud", status: 0, handledBy: null}]}, { productName: "2", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "3", comment: "hi", quantity: 2, subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}], zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "4", comment: "hi", subItems: [{subProductName:"tomates", quantity: 1, zones: [{name: "entrées", status: 0, handledBy: null}]}], quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "5", comment: "hi", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "6", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "7", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}, { productName: "8", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}]
    // }, 

    // {
    //   id: "2",
    //   label_id: "002",
    //   origine: "caisse",
    //   name: "Augustin",
    //   mode: "emporter",   
    //   status: 0,
    //   endTime: undefined,
    //   careTime: undefined,
    //   items: [{ productName: "burger", quantity: 2, zones: [{name: "entrées", status: 0, handledBy: null}]}]
    // },


// console.log(orders[0])
// orders[0].items.forEach((item, index) => {
//   console.log("item", item.productName, index)
//   console.log("length", item.subItems.length)
//   // item.subItems.forEach((subItem, indexSub) => {
//   //   console.log("subitem", subItem.subProductName, indexSub)
//   // })
// })

