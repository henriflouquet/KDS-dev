import Expo from 'expo';
import React, {Component, PureComponent} from 'react'
import { Text, ScrollView, Dimensions, SafeAreaView, TouchableOpacity, TouchableNativeFeedback, Image, View, TextInput, FlatList,  Platform } from 'react-native'
import styles from "../styles"
import { connect } from 'react-redux'
import moment from 'moment'
import Modal from "react-native-modal"
const {width, height}= Dimensions.get('window')
import {updateTimeStatus, updateNow, removeOrder} from '../redux/actions'
import Swiper from 'react-native-swiper'
// import DrawerLayout from 'react-native-gesture-handler/DrawerLayout'
import DrawerLayout from 'react-native-drawer-layout'
import Sidebar from 'react-native-sidebar'
import { TouchableHighlight } from 'react-native-gesture-handler';
import { AntDesign } from '@expo/vector-icons'
import ParkingButton from './parkingButton'
import _, { filter } from 'lodash'
import withPreventDoubleClick from './withPreventDoubleClick';
import BlinkView from 'react-native-blink-view'


class OrderCard extends PureComponent {  

    state = {
        modalContent: {},
        isVisible: false,
        count: 0,
        orders: [],
        sortedArray: [],
        loadMinimal: false,
        blink: false,
        blinkSortie: false,
        // now: new Date().getTime(),  
        isOpenedLeft: false,
        isOpenedRight: false,     
    }

    componentDidMount() {            
        setInterval(() => {            
            this.props.dispatch(updateNow())
          }, 1000)   
          
          if (this.props.user.settings && this.props.user.settings.blink && this.props.user.settings.blink.status) {
            
            this.interval = setInterval(() => {
                this.setState({blink: !this.state.blink})
              }, 1000);   
          }

          if (this.props.zone.isSortie && this.props.user.settings && this.props.user.settings.otherDone && this.props.user.settings.otherDone.blink) {
            
            this.intervalBlinkSortie = setInterval(() => {
                this.setState({blinkSortie: !this.state.blinkSortie})
              }, 1000);   
          }
         
               
       
        
    }

    componentWillUnmount = () => {
        if (this.interval) {
            clearInterval(this.interval);
        } 
        
        if (this.intervalBlinkSortie) {
            clearInterval(this.intervalBlinkSortie);
        } 
      };

   
 

    updateOrderStatus = (partialOrder, zoneOrder) => {  
        // console.log("zoneOrder", zoneOrder)      
        // const orderStatus = order.status + 1
        const zone = this.props.zone.name
        const ip = this.props.ip
        // console.log("TIMMMMMME", this.props.timeStatus)
        const order = this.props.orders[partialOrder.id]
        // console.log("IDDDD", order.id)
        // const itemOfZone = order.items.find(item => item.zone == zone)
        if (zoneOrder.status === 0) {
            this.props.dispatch({type:'server/takeOrderV2', order, zoneOrder, ip})   
        } else {
            // console.log("terminer recalled", order)
            const isSortie = this.props.zone.isSortie || false
            const print = this.props.user.settings.print || false
            this.props.dispatch(removeOrder(order))
            this.props.dispatch({type:'server/endOrderV2', order, zoneOrder, ip, isSortie, print}) 
        }
        
      }

      removeStandBy = (order) => {
        this.props.dispatch({type:'server/removeFromPending', order})
        this.props.dispatch(removeOrder(order))
      }

      renderAction = (order, zoneOrder, bgColor) => {
        //   console.log("zoneOrder", zoneOrder)
        // console.log("otherDone", order.otherDone)
        const MyTouchable = withPreventDoubleClick(TouchableOpacity);
        const zone = this.props.zone.name
        let backgroundColor = bgColor
        // console.log("zone", zone)

        // console.log(zoneOrder)
      
        if (this.props.zone.isSortie) {
            zoneOrder.status = 1
            // backgroundColor = this.props.user.settings.startColor
            // console.log("bg", backgroundColor)
        }
       

        let text1
        if (order.rank && (!order.rank.startsWith("1"))) {
            return (
               null
            )
        }
        // console.log("blink", this.state.blink)
        
        if (order.commande_status && order.commande_status == "standby") {
            
            return(
                
                    <TouchableOpacity style={[{flex: 0.75}, styles.center, {backgroundColor}]} onLongPress={() => this.removeStandBy(order)}> 
                        <View style={[{flex: 0.75}, styles.center]}><Text style={{fontSize: width / 100}}>Commande en stand by, maintenir pour supprimer</Text></View>
                    </TouchableOpacity>
                
                
            )
        } else if ((order.commande_status != "standby") && (zoneOrder.handledBy == null || zoneOrder.handledBy == this.props.ip)) {
            if (zoneOrder.status === 0) {
                text1 = "Prendre en charge"
            } else {
                text1 = "Terminer"
            }
            return(
                <TouchableOpacity style={[{flex: 0.75}, styles.center, {backgroundColor}]} onPress={() => this.updateOrderStatus(order, zoneOrder)}>  
                    {/* <View style={{backgroundColor, borderRadius: 2}}> */}
                        <Text style={{fontSize: width / 60, textDecorationLine: 'underline'}}>{text1}</Text>
                    {/* </View> */}
                </TouchableOpacity>
              )
        }  else {         
            
            return(
                <View style={[{flex: 0.75}, styles.center]}><Text style={{fontSize: width / 100}}>Pris en charge par {itemOfZone.handledBy}</Text></View>
            )
        }        
      }
      showModal = (order) => {     
        //   console.log("hiiiiii", order)   
        this.setState({isVisible: true, modalContent: order})
    }

    hideModal = () => {
        this.setState({isVisible: false, modalContent: {}})
    }

    // toArray = (orders) => {
    //     const newArray = Object.keys(orders).map((orderKey) => {
    //            return (this.createOrdersFromOrder(orders[orderKey]))
    //        } 
    //    return newArray.flat()
    //    }

    toArray = (orders) => {
        return Object.keys(orders)
        .map((orderKey) => orders[orderKey])
    }
    
    renderItemsModal = (order) => {
        if (Object.keys(order).length === 0 && order.constructor === Object) {
            return
        } 

        const settings = this.props.user.settings || {}
            
        const commentColor = settings.commentColor || "blue"
        const orderCommentColor = settings.orderCommentColor || "blue"


        const renderComment = (item, myColor) => {
            if (item.comment && item.comment != "") {
                const comment = item.comment.replace(/,/g, "\n")
                return(
                    <Text  style={{fontSize: height / 23, color: myColor, paddingLeft: 5, paddingRight: 5}}>{comment}</Text>
                )
            }
        }
        
        const zone = this.props.zone.name
        let itemsOfZone
        
        itemsOfZone = order.items.filter(item => item.zones.some(e => e.name === zone) || item.subItems && item.subItems.some(subItem => subItem.zones.some(e => e.name === zone)))

        return(
            
            <View>  
            <Text style={[styles.textColor, {fontSize: height / 18, textDecorationLine: "underline", paddingBottom: 10}]}>Commande {order.label_id}</Text> 
            {renderComment(order, orderCommentColor)}
                { itemsOfZone.map((item, i)=>{            
                    return(    
                        <View style={{flexWrap: 'wrap'}} key={i}>  
                                
                            <Text  style={[styles.textColor, {fontSize: height / 23, paddingRight: 5}]}>{item.quantity} - {item.productName}</Text>  
                            {renderComment(item, commentColor)}
                            {this.renderSubItems(item, "white", "modal")}
                        </View>                                    
                    )
                })}
                </View> 
        )
        
    }


    renderPagination = (index, total, context) => {
        if (total > 1) {
            return(
                <View style={[styles.paginationStyle, {flexDirection: "row"}]}>              
                
                 
                <Text style={styles.textColor}>
                    {index + 1}-{total}
                  </Text>
                  
                  
                  
                </View>
              )
            }
        }
        

    renderItems = (order) => {
        // console.log("order", order)
        const zone = this.props.zone.name
        let itemsOfZone = order.items.filter(item => item.zones.some(e => e.name === zone) || item.subItems && item.subItems.some(subItem => subItem.zones.some(e => e.name === zone)))

        const settings = this.props.user.settings || {}
            
        const color = settings.commentColor || "blue"

        const renderComment = (item) => {
            if (item.comment && item.comment != "") {
                const comment = item.comment.replace(/,/g, "\n")
                return(
                    <Text  style={{fontSize: height / 60, color: color, paddingLeft: 5, paddingRight: 5}}>{comment}</Text>
                )
            }
        }
        // console.log("itemssss", itemsOfZone)
        return itemsOfZone.map((item, i) => {  
                const midView = item.rank && item.rank != "1/2" ? null : <Text  style={{fontSize: height / 60, paddingLeft: 5, paddingRight: 5}}>{item.quantity}  {item.productName} {item.rank} </Text>
                const itemView =  item.zones.some(e => e.name === zone) ? midView : null
                return(    
                    <View style={{flexWrap: 'wrap'}} key={i}>           
                        {itemView}
                        { item.rank && item.rank != "1/2" ? null : renderComment(item)}
                        {this.renderSubItems(item, "black")}
                        {this.renderOrderSeparator(i, itemsOfZone.length)}
                    </View>              
                )
            
        })
    }

    renderOrderSeparator = (i, total) => {
        if (total > 1 && i != total - 1) {
            return(
                <View style={{borderBottomWidth: 1, borderColor: '#d3d3d3' }}></View>
            )
        }
    }

    shouldRenderItems = (order) => { 
        // console.log("order", order)       
        let count = 0
        const zone = this.props.zone.name
        if (order.comment != "") {
            
            count ++
        }

        order.items.forEach((item) => {
            if (item.zones.some(e => e.name === zone)) {
                count ++
                if (item.productName.length > 30) {
                    count ++
                }
                if (item.comment && item.comment != "") {
                    count ++
                }
                if (item.comment) {
                    if (item.comment.length > 15) {
                        // console.log(item.comment)
                        // console.log(item.comment.length)
                        count = count + (item.comment.length / 15)
                    }
                }
                
                if (item.subItems) {
                    item.subItems.forEach((subItem) => {
                        if (subItem.zones.some(e => e.name === zone)) {
                            count ++
                            if (subItem.subProductName.length > 28) {
                                count ++
                            }
                            if (subItem.comment && subItem.comment != "") {
                                count ++
                            }
                            if (subItem.comment) {
                                if (subItem.comment.length > 15) {
                                    count = count + (subItem.comment.length / 15)
                                }
                            }
                            
                        }
                        
                    })
                }
            } 
            
        })

        const settings = this.props.user.settings || {}
            
        
        const orderCommentColor = settings.orderCommentColor || "blue"

        const renderComment = (comment) => {
            if (comment && comment != "") {
                const newComment = comment.replace(/,/g, "\n")
                return(
                    <Text  style={{fontSize: height / 60, color: orderCommentColor, paddingLeft: 5, paddingRight: 5}}>{newComment}</Text>
                )
            }
        }
        // console.log(this.props.settings && this.props.settings.multiTickets)
        // console.log("TRUE", count < 9 || (this.props.settings && this.props.settings.multiTickets))
       if (count < 9 || (this.props.user.settings && this.props.user.settings.multiTickets)){
        return(
            <View>
                {renderComment(order.comment)}
                {this.renderItems(order)}
            </View>
            
        )
       } else {
           return(
               <TouchableOpacity style={[{flex:1, width: "100%"}, styles.center]} onPress={() => this.showModal(order)}>
                    <Text style={{textAlign: "center", fontSize: width / 70}}>Afficher la commande</Text>
               </TouchableOpacity>
           )
       }            
    }

    renderSubItems = (item, color, location) => {
        const fontSize = location == "modal" ? height / 30 : height / 70
        const zone = this.props.zone.name
        const settings = this.props.user.settings || {}
            
        const commentColor = settings.commentColor || "blue"

        const renderComment = (item) => {
            if (item.comment && item.comment != "") {
                const comment = item.comment.replace(/,/g, "\n")
                return(
                    <Text  style={{fontSize: height / 60, color: commentColor, paddingLeft: 5, paddingRight: 5}}>{comment}</Text>
                )
            }
        }
        if (item.subItems) {
            let subItemsOfZone = item.subItems.filter(subItem => subItem.zones.some(e => e.name === zone))
            return subItemsOfZone.map((subItem, i)=>{            
                return(    
                    <View key={i}>           
                        <Text  style={{fontSize, paddingLeft: 15, color}}>{subItem.quantity} {subItem.subProductName}</Text>   
                        {renderComment(subItem)}                     
                    </View>              
                  )
            }) 
        }
    }

    renderMainContent = (order, zoneOrder, backgroundColor) => {
        const settings = this.props.user.settings || {}
            
        
        return(
            <View style={{flex: 1, backgroundColor: "white"}}>
                <TouchableOpacity onLongPress={() => this.showModal(order)} style={{flex:1.5,flexDirection: 'row', flexDirection: 'column', flexWrap: 'wrap', borderColor: '#d3d3d3', borderBottomWidth: 1}}>
                    
                    {this.shouldRenderItems(order)}
                </TouchableOpacity>                        
                {this.renderAction(order, zoneOrder, backgroundColor)}                        
        </View>
        )
        
    }
    renderTimer = (order, zoneOrder, color, fontWeight) => {
         let now = moment(this.props.now)
            const zone = this.props.zone.name
            // console.log("order", order)
            // console.log("zoneOrder", zoneOrder)
            const settings = this.props.user.settings || {}

            let reference
            if (zoneOrder.status === 2) {
                return
            } else if (order.recalled && order.recalled.status) {
                reference = order.recalled.timestamp
                
            } else if (zoneOrder.status === 0 || this.props.zone.isSortie || settings.oneTimer) {
                reference = moment(order.timestamp)
            } else if (zoneOrder.status === 1) {
                reference = moment(order.careTime[zone])
            } 
            // console.log("reference", reference)
           
            // console.log("info", order.careTime[zone])
            const careTime1 = settings.careTime1 || 120
            const careTime2 = settings.careTime2 || 300
            const prepareTime1 = settings.prepareTime1 || 120
            const prepareTime2 = settings.prepareTime2 || 300

            let period = now.diff(reference, "seconds")
            // console.log("period", period)
            if (period < 0) {
                period = 0
            }
            // console.log("timestatus", this.props.timeStatus)
            if (zoneOrder.status === 0) {
                
                if (period > careTime1 && period < careTime2) {
                    if (!(order.id in this.props.timeStatus) || this.props.timeStatus[order.id] === 0) {
                        this.props.dispatch(updateTimeStatus(order.id, 1))
                    }
                } else if (period > careTime2) {
                    if (!(order.id in this.props.timeStatus) || this.props.timeStatus[order.id] === 1){
                        this.props.dispatch(updateTimeStatus(order.id, 2))
                    }
                }
            } else if (zoneOrder.status === 1) {
                if (period < prepareTime1) {
                    if (this.props.timeStatus[order.id] != 0) {
                        this.props.dispatch(updateTimeStatus(order.id, 0))
                    }
                } else if (period > prepareTime1 && period < prepareTime2) {
                    if (!(order.id in this.props.timeStatus) || this.props.timeStatus[order.id] === 0) {
                        this.props.dispatch(updateTimeStatus(order.id, 1))
                    }
                } else if (period > prepareTime2) {
                    if (!(order.id in this.props.timeStatus) || this.props.timeStatus[order.id] === 1){
                        this.props.dispatch(updateTimeStatus(order.id, 2))
                    }
                }
            }

            // if (period > 10 && period < 50) {             
                            
            // } else if (period > 50) {
            //     if (!(order.id in this.props.timeStatus) || this.props.timeStatus[order.id] === 1){
            //         this.props.dispatch(updateTimeStatus(order.id, 2))
            //     }
            // }
            let minutes = Math.floor(period / 60)
            minutes = minutes.toString()
            if (minutes.length === 1) {
                minutes = `0${minutes}`
            }
            let seconds = period - (minutes * 60)
            seconds = seconds.toString()
            if (seconds.length === 1) {
                seconds = `0${seconds}`
            }

            // if (order.recalled) {
            //     return 
            // }

            return(
                <Text style={{color, fontWeight,fontSize: width / 50, paddingRight: 5}}>{minutes}:{seconds}</Text>
            )
    }

 

    toggleSidebar = () => {
        if (this.state.isOpenedLeft == true) {
            // console.log("hi")
            this.setState({isOpenedLeft: false})
        } else {
            this.setState({isOpenedLeft: true})
        }
       
    }

    renderToggleSidebarRight = () => {
        const image = this.state.isOpenedRight ?  <Image style={{height: height / 13, width: height / 13}} source={require('../assets/articles-noir.png')}></Image> 
        :
        <Image style={{height: height / 13, width: height / 13}} source={require('../assets/articles-blanc.png')}></Image>
        return(
            <TouchableHighlight  onPress={() => this.setState({isOpenedRight: !this.state.isOpenedRight})}>
                {image}
                
            </TouchableHighlight>
            
        )
    }

    renderToggleSidebarLeft = (sliceIndex, isMultiTickets) => {
        if (isMultiTickets){
            return
        }
        let count = Object.keys(this.props.orders).length - sliceIndex
        count = count > 0 ? count : 0
        // count = this.state.count
        const image = this.state.isOpenedLeft ?  <Image style={{height: height / 13, width: height / 13}} source={require('../assets/parking-noir.png')}></Image> 
        :
        <Image style={{height: height / 13, width: height / 13}} source={require('../assets/parking-blanc.png')}></Image>
         
        return(
            <View style={{flex: 1, zIndex : 1, position: "absolute", flexDirection: "row", top: -(width / 50), left: 10}}>
                <TouchableHighlight onPress={() => this.setState({isOpenedLeft: !this.state.isOpenedLeft})}>
                    {image}  
                                
                </TouchableHighlight> 
                <Text style={styles.textColor}>{count}</Text>
            </View>
            
        )
    }




    renderLeftSidebarContent = (sortedArray, sliceIndex, isMultiTickets) => {
        if (isMultiTickets){
            return
        }
        // if (newSortedArray.length == 0 || newSortedArray.length <= sliceIndex) {
        //     return
        // }
        const zone = this.props.zone.name
        // const lastOrder = newSortedArray[sliceIndex - 1]
        
        // const lastId = newSortedArray[sliceIndex - 1].id 
        
        // const partialNewArray = newSortedArray.slice(sliceIndex - 1)
        
        // const firstOrderToDisplay = partialNewArray.find((el) => el.id != lastId)
        // const indexToStart = sortedArray.findIndex((order) => order.id === firstOrderToDisplay.id)
        // const count = sortedArray.length - indexToStart
        // if (count != this.state.count) {
            
        //     this.setState({count: count})
        // }
        
        const orders = sortedArray.slice(sliceIndex).reverse().map((order, i) => {
            let itemOfZone = order.items.find(item => item.zones.some(e => e.name == zone))
            // console.log("item of zone left", itemOfZone)
            if (!itemOfZone) {                
                for (let i = 0; i < order.items.length; i++) {
                  itemOfZone = order.items[i].subItems.find((subItem) => subItem.zones.some(e => e.name === zone))
                  if (itemOfZone) {
                      break
                  }
                }              
            }           
            
            
            const zoneOrder = itemOfZone.zones.find((e) => e.name == zone)
            console.log("zoneOrder 579", zoneOrder)
            return(
                <View key={i} style={styles.sideOrders}>
                    <View key={i} style={[{flexDirection: "row", justifyContent: "space-between"}]}>
                        <Text style={[styles.textColor, {fontWeight: "bold", fontSize: width / 50, paddingLeft: 15}]}>{order.label_id}</Text>
                        {this.renderTimer(order, zoneOrder, "white", "bold")} 
                    </View> 
                    <View style={{alignItems: "center", justifyContent: "center"}}>
                        <Text style={[styles.textColor, {fontWeight: "bold"}]}>{order.items.length} ARTICLES</Text>
                    </View>
                </View>                  
                      
            )
        })
        
        
        if (this.state.isOpenedLeft) {
            return(
                <ScrollView  ref="scrollView"
                    onContentSizeChange={(width,height) => this.refs.scrollView.scrollTo({y:height})} style={{flex: 1, paddingLeft: 7, marginBottom: 10, borderColor: 'white', marginTop: height / 10, borderRightWidth: 2}}>
                    {orders}
                </ScrollView>
            )
        }     
    }   
    
    renderRightSidebarContent = () => {
        if (this.state.isOpenedRight) {
            const zone = this.props.zone.name
            
            const totalItems = {}
            const totalSubItems = {}
            const orders = this.props.orders
            Object.keys(this.props.orders).forEach((order) => {           
                    orders[order].items.forEach((item) => {
                        if (item.zones.some(e => e.name === zone)) {
                            if (item.productName in totalItems) {
                                totalItems[item.productName] = totalItems[item.productName] + item.quantity
                            } else {
                                totalItems[item.productName] = item.quantity
                            }
                        }
                        if (item.subItems) {
                            item.subItems.forEach((subItem) => {
                                if (subItem.zones.some(e => e.name === zone)) {
                                    if (subItem.subProductName in totalSubItems) {
                                        totalSubItems[subItem.subProductName] = totalSubItems[subItem.subProductName] + subItem.quantity
                                    } else {
                                        totalSubItems[subItem.subProductName] = subItem.quantity
                                    }
                                }
                            })
                        }
                        
                    })
            })  
            
            const itemViews = Object.keys(totalItems).map((product, i) => {
                return(
                    <Text style={[styles.textColor, {paddingRight: 30}]} key={i}>{product} X {totalItems[product]}</Text>
                )
            })

            const subItemViews = Object.keys(totalSubItems).map((product, i) => {
                return(
                    <Text style={[styles.textColor, {paddingRight: 30}]} key={i}>{product} X {totalSubItems[product]}</Text>
                )
            })
            
            
            return(
                <ScrollView contentContainerStyle={{flex: 1, borderColor: 'white',  borderLeftWidth: 2, paddingTop: 10, paddingLeft: 5, backgroundColor: "black"}}>
                        <Text style={[styles.textColor, {textDecorationLine: 'underline', paddingBottom: 20}]}> Produits à cuisiner</Text>
                        {itemViews}
                        <Text style={[styles.textColor, {textDecorationLine: 'underline', paddingTop: 20, paddingBottom: 20}]}> Ingrédients à cuisiner</Text>
                        {subItemViews}

                </ScrollView> 
                
            )
        }
        
    }

  

    renderImage = (order) => {
            // console.log("order", order)
            // console.log("mode", order.mode)
            if (order.mode === "surplace") {
                return(
                     <Image style={{height: height / 16, width: height / 16}} source={require('../assets/sur-place.png')}></Image>
                )
                
            } else if (order.mode === "emporter") {
                return(
                    <Image style={{height: height / 16, width: height / 16}} source={require('../assets/a-emporter.png')}></Image>
                )
            } else if (order.mode === "livraison") {
                return(
                    <Image style={{height: height / 16, width: height / 16}} source={require('../assets/livraison.png')}></Image>
                ) 
            }
            
    }

    createOrders = (array) => {
        let filteredArray = [...array]
        const filters = this.props.zone.filters
        // console.log("filters", filters)
        if (filters) {
            filteredArray = filteredArray.filter((order) => {
                // console.log("isTrue", (!filter.mode || filter.mode == "" || filter.mode == order.mode) && (!filter.origine || filter.origine == "" || filter.origine == order.origine)&& (!filter.status || filter.status == "" || filter.status == order.status))
                return filters.some((filter) => {
                    return (!filter.mode || filter.mode == "" || filter.mode == order.mode) && (!filter.origine || filter.origine == "" || filter.origine == order.origine)&& (!filter.status || filter.status == "" || filter.status == order.status)
                })                
            })
        }
        
        const deepArray = filteredArray.map((order) => {
            let otherDone = false
            if (this.props.zone.isSortie) {
                otherDone = true
                    
                order.items.forEach((item) => {
                    item.zones.forEach((zone) => {
                        if (zone.name != this.props.zone.name) {
                            // console.log(order)
                            // console.log(order.id, zone.status)
                            if (zone.status != 2) {
                                otherDone = false
                                
                            }
                        }
                    })
                    if (item.subItems) {
                        item.subItems.forEach((subItem) => {
                            subItem.zones.forEach((subZone) => {
                                if (subZone.name != this.props.zone.name) {
                                    // console.log("hi", subZone.status)
                                    if (subZone.status != 2) {
                                        
                                        otherDone = false
                                        
                                    }
                                }
                            })
                        })
                    }
                    
                })
            }
            

            const midArray = this.createOrdersFromOrder(order, [], this.props.zone.name, true)
            return midArray.map((midOrder, index) => {
                if (order.otherDone) {
                    // console.log('salut')
                    midOrder.otherDone = true
                } else {
                    midOrder.otherDone = otherDone
                }
                
                if (midArray.length > 1) {
                    midOrder.rank = `${index + 1}/${midArray.length}`
                    return midOrder
                } else {
                    return midOrder
                }
            })
        })

        return deepArray.flat()
    }

    createOrdersFromOrder = (order, ordersArray, zone, isFirst) => { 
        
        let max = isFirst ? 8 : 12       
        
        let count = 0
        if (!isFirst) {
            order.comment = ""
        }
        if (order.comment && order.comment != "") {
            // console.log("hi")
            count ++
            
            
        }
        
        let partialOrder = {}
        for (let indexItem = 0; indexItem < order.items.length; indexItem++) {
          
          const item = order.items[indexItem]
          if (item.zones.some(e => e.name === zone)) {  
           
            if (item.productName.length > 30) {
                
                count ++
              }
        
              if (item.comment && item.comment != "") {
                //   console.log("hello")
                count ++
              }
      
            if (count <= max) {        
              count ++
              
            } else {  
                         
              partialOrder = {...order}
             const slicer = item.comment && item.comment != "" ? indexItem  : indexItem + 1
            
              let partialOrderItems = [...partialOrder.items]
             
              const newPartialItems = partialOrderItems.splice(0, slicer)
            
              partialOrder.items = newPartialItems
            
              ordersArray.push(partialOrder)        
              const orderWithLeftItems = {...order}  
              const itemsForLeft = [...orderWithLeftItems.items]                
              const itemsOrderWithLeftItems = itemsForLeft.slice(slicer)                        
            //   if (itemsOrderWithLeftItems.length == 0) {                    
                orderWithLeftItems.items = itemsOrderWithLeftItems         
                // console.log("order LEFTTT", orderWithLeftItems)
                // return
                ordersArray = this.createOrdersFromOrder(orderWithLeftItems, ordersArray, zone, false) 
                return ordersArray    
                            
            } 
          }   
          
           
            if(item.subItems) {
              for (let indexSubItem = 0; indexSubItem < item.subItems.length; indexSubItem++) {  
                
                const subItem = item.subItems[indexSubItem]
                if (subItem.zones.some(e => e.name === zone)) {
                  if (subItem.subProductName.length > 30) {
                    count ++
                  }
            
                  if (subItem.comment && subItem.comment != "") {                    
                    count ++
                  }        
                 
                  if (count <= max) {
                    count ++
                  } else {
                    
                    const newItem = {...item}
                    partialOrder = Object.assign({}, order)
                    
                    let slicer = subItem.comment && subItem.comment != "" ? indexSubItem - 1 : indexSubItem
                    
                    const newSubItems = [...newItem.subItems]           
                    const partialSubItems = newSubItems.slice(0, slicer)            
                    newItem.subItems = partialSubItems
                    const newItems = [...partialOrder.items]
                    newItems[indexItem] = newItem
                    newItems[indexItem].rank = "1/2"
                    const finalItemsForPartial = newItems.splice(0, indexItem + 1)
                    partialOrder.items = finalItemsForPartial                   
                    
                    ordersArray.push(partialOrder)                    
                   
                    const newItemForLeft = {...item}
                    // console.log(order)
                    const newOrderForLeft = {...order}
                   
                   
                    const subItemsForLeft = [...newItemForLeft.subItems] 
                    
                    const leftSubItems = subItemsForLeft.slice(slicer)                   
                    
                    newItemForLeft.subItems = leftSubItems
                    const newItemsForLeft = [...newOrderForLeft.items]
                    newItemForLeft.rank = "2/2"
                    newItemsForLeft[indexItem] = newItemForLeft
                    const finalItemsForLeft = newItemsForLeft.slice(indexItem)
                //    console.log(finalItemsForLeft.length)
                    newOrderForLeft.items = finalItemsForLeft
                    // console.log("array", ordersArray.length)
                    
                    ordersArray = this.createOrdersFromOrder(newOrderForLeft, ordersArray, zone, false)
                    
                    return ordersArray
                   
                    break
                    
                  }
                  
                }
              }
            }
            
        }
        
        
       if (Object.keys(partialOrder).length == 0 && partialOrder.constructor === Object) {
            // console.log("order after break", order)    
                // console.log("order", order)
                ordersArray.push(order)
                
                return  ordersArray
                
          }           
        }


    renderPagedCards = (sortedArray, sliceIndex) => {
        let ordersChunks = []
        const zone = this.props.zone.name
        const newOrders = this.createOrders(sortedArray)
        // console.log("length", newOrders[0])
        const numOfPages = Math.ceil(newOrders.length / sliceIndex)
        if (numOfPages > 1 && this.state.loadMinimal === false) {
            this.setState({loadMinimal: true})
        } else if (numOfPages === 1 && this.state.loadMinimal === true) {
            this.setState({loadMinimal: false})
        }
        
       
        let myIndex = 0
        let i
        for (i = 0; i < numOfPages; i++) {
            const newArray = newOrders.slice(myIndex, myIndex + sliceIndex)
            ordersChunks.push(newArray)
            myIndex = myIndex + sliceIndex
          }
        //   console.log("NEW LENGTH", ordersChunks.length)
          let pageComponents = ordersChunks.map((page, i) => {
            const orderCards = page.map((order, orderIndex) => { 

                const hasItem = order.items.some(item => item.zones.some(e => e.name === this.props.zone.name))               
               
                let hasSubItem = false
                
                for (let i = 0; i < order.items.length; i++) {
                    if (order.items[i].subItems) {
                        hasSubItem = order.items[i].subItems.some(subItem => subItem.zones.some(e => e.name === this.props.zone.name))
                    if (hasSubItem) {
                        break
                    }
                  } 
                }                    

                if (!hasItem && !hasSubItem) {
                    return
                }
                
            let backgroundColor
            let itemOfZone = order.items.find(item => item.zones.some(e => e.name === zone))
            
            if (!itemOfZone) {                
                for (let i = 0; i < order.items.length; i++) {
                  itemOfZone = order.items[i].subItems.find((subItem) => subItem.zones.some(e => e.name === zone))
                  if (itemOfZone) {
                      break
                  }
                }              
            }
      
            const hourOrder = order.timestamp === 0 ? "rappel" : moment(order.timestamp).format('HH:mm')
            
            const settings = this.props.user.settings || {}
            // console.log(settings.isSortie)
            const timeStatus = this.props.timeStatus

            const zoneOrder = itemOfZone.zones.find((e) => e.name == zone) 
              
            if (order.commande_status == "standby") {
                const blinkColor = this.props.user.settings && this.props.user.settings.blink && this.props.user.settings.blink.status && this.props.user.settings.blink.color && this.props.user.settings.blink.color != "" ? this.props.user.settings.blink.color : "yellow"
                backgroundColor = this.state.blink ? blinkColor : "gray"
            } else if (zoneOrder.handledBy == null || zoneOrder.handledBy == this.props.ip) {

              
                if (this.props.zone.isSortie && order.otherDone) {    
                        const blinkSortieColor = settings.otherDone.color ||"brown" 
                        const alternateColor = settings.otherDone.blink ? "gray" : blinkSortieColor           
                        backgroundColor = this.state.blinkSortie ? blinkSortieColor : alternateColor             
                } else if (this.props.zone.isSortie) {
                    if (order.status === 0) {
                        backgroundColor =  settings.startColor ? settings.startColor : "#F47C6D"
                    } else if (order.status === 1) {
                        backgroundColor =  settings.startColorCared || "gainsboro" 
                    }
                     
                } else if (!zoneOrder || zoneOrder.status === 2) {
                    backgroundColor =  settings.recallColor || "grey"
                } else if (timeStatus[order.id] === 1 && zoneOrder.status === 0) {
                    backgroundColor =  settings.alertCare1 ? settings.alertCare1 : "#F47C6D" 
                } else if (timeStatus[order.id] === 1 && zoneOrder.status === 1) {                    
                    backgroundColor =  settings.alertPrepare1 ? settings.alertPrepare1 : "#F47C6D" 
                } else if (timeStatus[order.id] === 2 && zoneOrder.status === 0){                    
                    backgroundColor =  settings.alertCare2 ? settings.alertCare2 : "#D81245"                  
                } else if (timeStatus[order.id] === 2 && zoneOrder.status === 1){
                    backgroundColor =  settings.alertPrepare2 ? settings.alertPrepare2 : "#D81245"  
                            
                }  else if (zoneOrder.status === 0) {
                    backgroundColor =  settings.startColor || "gainsboro"              
                } else if ( zoneOrder.status === 1) {
                    // console.log("SPOOOOOT")
                    backgroundColor =  settings.startColorCared || "gainsboro" 
                }
            } else {
                backgroundColor = "gray"
            } 
            
            
                
                return(
                    <View key={orderIndex} style={styles.layout}>                
                        <View style={styles.itemContainer}>    
                            <View style={{height: height / 10, backgroundColor}}>
                                <View style={{flexDirection: "row", justifyContent: "space-between"}}>      
                                    {this.renderImage(order)}                    
                                    <Text style={{fontSize: width / 50}}>#{order.label_id}</Text>
                                    
                                    {this.renderTimer(order, zoneOrder, "black", "normal")}                        
                                </View>
                                <View style={{flexDirection: "row", marginBottom: 0, marginTop: "auto", justifyContent: "space-between"}}>                          
                                    <Text style={{fontSize: width / 80, marginBottom: 0, marginTop: "auto"}}>{hourOrder}</Text>
                                    <Text style={{fontSize: width / 80, marginLeft: width / 70, marginRight: "auto", marginBottom: 0, marginTop: "auto"}}>{order.origine}{order.rank ? `- ${order.rank}` : null}</Text>
                                    
                                    <Text style={{fontSize: width / 80}}>{order.name}</Text>
                                                        
                                </View>
                            </View>            
                            
                            {this.renderMainContent(order, zoneOrder, backgroundColor)}                 
                        </View>                
                    </View>
                  )
              })
           return(
                 <View key={i} style={styles.componentFinished}>
                    <View style={styles.layoutsFinished}>
                        {orderCards}
                    </View>
                </View>
            )
           
        })

        return(
            <Swiper loop={false} loadMinimal={this.state.loadMinimal} renderPagination={this.renderPagination}>
                {pageComponents}
            </Swiper>
        )
    }   

    renderCardContent = (sortedArray, sliceIndex, isMultiTickets) => {       
        let filteredArray = [...sortedArray]
        const filters = this.props.zone.filters
        // console.log("filters", filters)
        if (filters) {
            filteredArray = filteredArray.filter((order) => {
                // console.log("isTrue", (!filter.mode || filter.mode == "" || filter.mode == order.mode) && (!filter.origine || filter.origine == "" || filter.origine == order.origine)&& (!filter.status || filter.status == "" || filter.status == order.status))
                return filters.some((filter) => {
                    return (!filter.mode || filter.mode == "" || filter.mode == order.mode) && (!filter.origine || filter.origine == "" || filter.origine == order.origine)&& (!filter.status || filter.status == "" || filter.status == order.status)
                })                
            })
        }
        const orderCards = filteredArray.slice(0, sliceIndex).map((order, orderIndex) => {            
            if (this.props.now === null) {
                return null               
            }     
            const zone = this.props.zone.name

            let backgroundColor
            let itemOfZone = order.items.find(item => item.zones.some(e => e.name === zone))
            
            if (!itemOfZone) {                
                for (let i = 0; i < order.items.length; i++) {
                  itemOfZone = order.items[i].subItems.find((subItem) => subItem.zones.some(e => e.name === zone))
                  if (itemOfZone) {
                      break
                  }
                }              
            }

            // console.log("item of zone ERROR", itemOfZone)
            // if (typeof itemOfZone == "undefined") {
            //     itemOfZone = {}
            // }
            // console.log("itemofzone render", itemOfZone)
            // sub =  order.items.forEach((item) => {
            //     item.subItems.forEach((subItem) => {
            //        subItem.zones.some(e => e.name === zone)
                    
            //     })
            // })
            
            
            const timeStatus = this.props.timeStatus
            const settings = this.props.user.settings || {}
            let zoneOrder
            if (itemOfZone) {
                 zoneOrder = itemOfZone.zones.find((e) => e.name == zone) 
            }

            if (!zoneOrder) {
                return
            }
                
            
            
            
            // console.log("STATUS", this.props.timeStatus)
            if (order.commande_status == "standby") {
                const blinkColor = settings.blink.color || "yellow"
                const alternateColor = settings.blink.status ? "gray" : blinkColor
                backgroundColor = this.state.blink ? blinkColor : alternateColor
                
            } else if (zoneOrder.handledBy == null ||  zoneOrder.handledBy == this.props.ip) {

                    
                
                    let otherDone = true
                        
                    order.items.forEach((item) => {
                        item.zones.forEach((zone) => {
                            if (zone.name != this.props.zone.name) {
                                if (zone.status != 2) {
                                    otherDone = false
                                    
                                }
                            }
                        })
                        if (item.subItems) {
                            item.subItems.forEach((subItem) => {
                                subItem.zones.forEach((subZone) => {
                                    if (subZone.name != this.props.zone.name) {
                                        if (subZone.status != 2) {
                                            otherDone = false
                                            
                                        }
                                    }
                                })
                            })
                        }
                        
                    })

                //     if (this.props.zone.isSortie && otherDone) {    
                //         const blinkSortieColor = settings.otherDone.color ||"brown" 
                //         const alternateColor = settings.otherDone.blink ? "gray" : blinkSortieColor           
                //         backgroundColor = this.state.blinkSortie ? blinkSortieColor : alternateColor             
                // } else if (this.props.zone.isSortie) {
                //     backgroundColor =  settings.alertCare1 ? settings.alertCare1 : "#F47C6D" 
                // }

                 
                    if (this.props.zone.isSortie && otherDone) {    
                        const blinkSortieColor = settings.otherDone.color ||"brown" 
                        const alternateColor = settings.otherDone.blink ? "gray" : blinkSortieColor           
                        backgroundColor = this.state.blinkSortie ? blinkSortieColor : alternateColor             
                } else if (this.props.zone.isSortie) {
                    if (order.status === 0) {
                        backgroundColor =  settings.startColor ? settings.startColor : "#F47C6D"
                    } else if (order.status === 1) {
                        backgroundColor =  settings.startColorCared || "gainsboro" 
                    }
                } else if (!zoneOrder || zoneOrder.status === 2) {
                    backgroundColor =  settings.recallColor || "grey"
                } else if (timeStatus[order.id] === 1 && zoneOrder.status === 0) {
                    backgroundColor =  settings.alertCare1 ? settings.alertCare1 : "#F47C6D" 
                } else if (timeStatus[order.id] === 1 && zoneOrder.status === 1) {                    
                    backgroundColor =  settings.alertPrepare1 ? settings.alertPrepare1 : "#F47C6D" 
                } else if (timeStatus[order.id] === 2 && zoneOrder.status === 0){                    
                    backgroundColor =  settings.alertCare2 ? settings.alertCare2 : "#D81245"                  
                } else if (timeStatus[order.id] === 2 && zoneOrder.status === 1){
                    backgroundColor =  settings.alertPrepare2 ? settings.alertPrepare2 : "#D81245"  
                            
                }  else if (zoneOrder.status === 0) {
                    
                    backgroundColor =  settings.startColor || "gainsboro"              
                } else if ( zoneOrder.status === 1) {
                    
                    backgroundColor =  settings.startColorCared || "gainsboro" 
                }
            } else {
                backgroundColor = "gray"
            } 
            
            
            const hourOrder = order.timestamp === 0 ? "rappel" : moment(order.timestamp).format('HH:mm')
            // console.log("backroundColor", backgroundColor)

          return(
              <View key={orderIndex} style={styles.layout}>                
                  <View style={styles.itemContainer}>    
                      <View style={{height: height / 10, backgroundColor}}>
                        <View style={{flexDirection: "row", justifyContent: "space-between"}}>      
                            {this.renderImage(order)}                    
                            <Text style={{fontSize: width / 50}}>#{order.label_id}</Text>
                            
                            {this.renderTimer(order, zoneOrder, "black", "normal")}                        
                        </View>
                        <View style={{flexDirection: "row", marginBottom: 0, marginTop: "auto", justifyContent: "space-between"}}>                          
                            <Text style={{fontSize: width / 80, marginBottom: 0, marginTop: "auto"}}>{hourOrder}</Text>
                            <Text style={{fontSize: width / 80, marginLeft: width / 70, marginRight: "auto", marginBottom: 0, marginTop: "auto"}}>{order.origine}{order.rank ? `- ${order.rank}` : null}</Text>
                            
                            <Text style={{fontSize: width / 80}}>{order.name}</Text>
                                                  
                        </View>
                    </View>            
                      
                      {this.renderMainContent(order, zoneOrder, backgroundColor)}                 
                  </View>                
              </View>
          )
        }) 
        if (isMultiTickets) {
            return(
                this.renderPagedCards(sortedArray, sliceIndex)
            )
        } else {
            return orderCards
        }
        
    }

    render() {      
        
        const flexSidebarLeft = this.state.isOpenedLeft ? 0.23 : 0
        const flexSidebarRight = this.state.isOpenedRight ? 0.23 : 0       
        
        let sliceIndex
        if (this.state.isOpenedLeft && this.state.isOpenedRight) {
            sliceIndex = 6
        } else if ((!this.state.isOpenedLeft && this.state.isOpenedRight) || (this.state.isOpenedLeft && !this.state.isOpenedRight)) {
            sliceIndex = 8
        }  else if (!this.state.isOpenedLeft && !this.state.isOpenedRight) {
            sliceIndex = 10
        } 
        

        const orders = this.props.orders
        // console.log("orders", orders)
        // const ordersArray = this.toeArray(orders)  
              
        // let sortedArray = ordersArray.sort(function(a, b) {
        //     return a.timestamp - b.timestamp
        // })   
        const ordersArray = this.toArray(orders)
        
        const ordersArrayNoRecall = ordersArray.filter(order => !order.recalled)
        // console.log("no recall", ordersArrayNoRecall)  
        const sortedArrayNoRecall =  ordersArrayNoRecall.sort(function(a, b) {
            return a.timestamp - b.timestamp
        }) 
        // console.log("no recall sorted", sortedArrayNoRecall)  
        const ordersArrayRecall = ordersArray.filter(order => order.recalled)  
        const sortedArrayRecall =  ordersArrayRecall.sort(function(a, b) {
            return a.recalled.timestamp - b.recalled.timestamp
        })    
        // console.log("recall sorted", sortedArrayRecall)
        const sortedArray = sortedArrayRecall.concat(sortedArrayNoRecall)
        // const finalArray = this.props.user.settings && this.props.user.settings.multiTickets ? this.createOrders(sortedArray) : sortedArray
        // console.log("array", finalArray.length)
        // const newSortedArray = this.createOrders(sortedArray)
        // console.log("New split", newSortedArray)
        const isMultiTickets = this.props.user.settings && this.props.user.settings.multiTickets 
        
        
        // const orderCards = sortedArray.slice(0, sliceIndex).map((order, orderIndex) => {            
        //     if (this.props.now === null) {
        //         return null               
        //     }     
        //     const zone = this.props.zone.name

        //     let backgroundColor
        //     let itemOfZone = order.items.find(item => item.zones.some(e => e.name === zone))
            
        //     if (!itemOfZone) {                
        //         for (let i = 0; i < order.items.length; i++) {
        //           itemOfZone = order.items[i].subItems.find((subItem) => subItem.zones.some(e => e.name === zone))
        //           if (itemOfZone) {
        //               break
        //           }
        //         }              
        //     }
        //     // console.log("itemofzone render", itemOfZone)
        //     // sub =  order.items.forEach((item) => {
        //     //     item.subItems.forEach((subItem) => {
        //     //        subItem.zones.some(e => e.name === zone)
                    
        //     //     })
        //     // })
            
            
        //     const timeStatus = this.props.timeStatus
        //     const settings = this.props.user.settings || {}
        //     const zoneOrder = itemOfZone.zones.find((e) => e.name == zone)
        //     // console.log("zoneOrder", zoneOrder)
        //     // console.log("STATUS", this.props.timeStatus)
        //     if (order.status == -1) {
        //         backgroundColor = "gray" 
        //     } else if (zoneOrder.handledBy == null || zoneOrder.handledBy == this.props.ip) {
        //         if (!zoneOrder || zoneOrder.status === 2) {
        //             backgroundColor =  settings.recallColor || "grey"
        //         } else if (timeStatus[order.id] === 1 && zoneOrder.status === 0) {
        //             backgroundColor =  settings.alertCare1 ? settings.alertCare1 : "#F47C6D" 
        //         } else if (timeStatus[order.id] === 1 && zoneOrder.status === 1) {
                    
        //             backgroundColor =  settings.alertPrepare1 ? settings.alertPrepare1 : "#F47C6D" 
        //         } else if (timeStatus[order.id] === 2 && zoneOrder.status === 0){

                    
        //             backgroundColor =  settings.alertCare2 ? settings.alertCare2 : "#D81245"                  
        //         } else if (timeStatus[order.id] === 2 && zoneOrder.status === 1){
        //             backgroundColor =  settings.alertPrepare2 ? settings.alertPrepare2 : "#D81245"                  
                            
        //         }  else if (zoneOrder.status === 0) {
        //             backgroundColor =  settings.startColor || "gainsboro"              
        //         } else if ( zoneOrder.status === 1) {
        //             // console.log("SPOOOOOT")
        //             backgroundColor =  settings.startColorCared || "gainsboro" 
        //         }
        //     } else {
        //         backgroundColor = "gray"
        //     } 
            
        //     const hourOrder = order.timestamp === 0 ? "rappel" : moment(order.timestamp).format('HH:mm')
        //     // console.log("backroundColor", backgroundColor)

        //   return(
        //       <View key={orderIndex} style={styles.layout}>                
        //           <View style={styles.itemContainer}>    
        //               <View style={{height: height / 10, backgroundColor}}>
        //                 <View style={{flexDirection: "row", justifyContent: "space-between"}}>      
        //                     {this.renderImage(order)}                    
        //                     <Text style={{fontSize: width / 50}}>#{order.label_id}</Text>
                            
        //                     {this.renderTimer(order, zoneOrder, "black", "normal")}                        
        //                 </View>
        //                 <View style={{flexDirection: "row", marginBottom: 0, marginTop: "auto", justifyContent: "space-between"}}>                          
        //                     <Text style={{fontSize: width / 80, marginBottom: 0, marginTop: "auto"}}>{hourOrder}</Text>
        //                     <Text style={{fontSize: width / 80, marginLeft: width / 70, marginRight: "auto", marginBottom: 0, marginTop: "auto"}}>{order.origine}{order.rank ? `- ${order.rank}` : null}</Text>
                            
        //                     <Text style={{fontSize: width / 80}}>{order.name}</Text>
                                                  
        //                 </View>
        //             </View>            
                      
        //               {this.renderMainContent(order, zoneOrder, backgroundColor)}                 
        //           </View>                
        //       </View>
        //   )
        // })       
        const settings = this.props.user.settings || {}
        const flexDirection = settings.cardOrder === "reverse" ? "row" : "row-reverse"
        const flexWrap = settings.cardOrder === "reverse" ? "wrap" : "wrap-reverse"
        const marginComponent =  settings.cardOrder === "reverse" ? {marginTop: height / 25 } : { marginTop: 'auto', marginBottom: height / 25 }
        
        return(
                <View style={{ flex: 1 }}>                            
                    
                    <View style={{flex: 1, flexDirection: "row"}}>
                        <View style={{flex: flexSidebarLeft, backgroundColor: "black"}}>
                        
                            {this.renderToggleSidebarLeft(sliceIndex, isMultiTickets)}
                        
                            {this.renderLeftSidebarContent(sortedArray, sliceIndex, isMultiTickets)}                 
                                 
                        </View>       
                        {/* <View style={{flex: 1, zIndex : 1, position: "absolute", top: -35, right: -20}}>
                                {this.renderOuvrir()}
                            </View>                   */}
                        <View style={{flex: 1}}>
                            
                        
                            <Modal
                                isVisible={this.state.isVisible}
                                onBackdropPress={() => this.setState({ isVisible: false })}
                                
                                backdropColor={"black"}
                                backdropOpacity={0.7}
                                style={styles.modal}
                                
                            >
                                <ScrollView contentContainerStyle={[{alignItems: 'center', flexWrap: 'wrap'}]}>
                                    {this.renderItemsModal(this.state.modalContent)}
                                </ScrollView>
                                        
                            </Modal>
                            
                            
                            <View style={[styles.component, marginComponent]}>
                                <View style={{flexDirection, flexWrap}}>
                                    {this.renderCardContent(sortedArray, sliceIndex, isMultiTickets)}
                                    
                                </View>
                            </View>          
                        </View>  
                        <View style={{flex: flexSidebarRight, backgroundColor: "black"}}>
                            <View style={{flex: 1, zIndex : 1, position: "absolute", top: -(width / 50), right: 10}}>
                                {this.renderToggleSidebarRight()}
                            </View>
                            {this.renderRightSidebarContent()}                 
                                 
                        </View>
                    </View>
                </View>      
           
          )
    }
}

function mapStateToProps(state) {
    return {
      orders: state.orders,
      zone: state.zone,
      ip: state.ip,
      timeStatus: state.timeStatus,
      user: state.user,
      now: state.now
    };
  }
  
  export default connect(mapStateToProps)(OrderCard);

   