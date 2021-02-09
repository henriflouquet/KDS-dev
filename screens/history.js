import * as Updates from 'expo-updates'
import React, {Component} from 'react'
import { Text, View, ScrollView, TouchableOpacity, AsyncStorage, Image, SafeAreaView,  StatusBar, StyleSheet, Dimensions } from 'react-native'
import { connect } from 'react-redux'
import styles from "../styles"
import Modal from "react-native-modal"
import { AntDesign } from '@expo/vector-icons'
import moment from 'moment'
import Swiper from 'react-native-swiper'
const {width, height}= Dimensions.get('window')



class History extends Component { 
    state = {
        modalContent: {},
        isVisible: false,
        modalRecallVisible: false,
        orderModal: {}
        
    }
    showModal = (order) => {        
        this.setState({isVisible: true, modalContent: order})
    }
    hideModal = () => {
        this.setState({isVisible: false, modalContent: {}})
    }

    renderItemsModal = (order) => {
        if (Object.keys(order).length === 0 && order.constructor === Object) {
            return
        } 

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

        const zone = this.props.zone.name
        let itemsOfZone = order.items.filter(item => item.zones.some(e => e.name === zone) || item.subItems && item.subItems.some(subItem => subItem.zones.some(e => e.name === zone)))
        return(
            
            <View>  
            <Text style={[styles.textColor, {fontSize: height / 18, textDecorationLine: "underline", paddingBottom: 10}]}>Commande {order.label_id}</Text> 
                { itemsOfZone.map((item, i)=>{            
                    return(    
                        <View style={{flexWrap: 'wrap'}} key={i}>  
                                
                            <Text  style={[styles.textColor, {fontSize: height / 23, paddingRight: 5}]}>{item.quantity} - {item.productName}</Text>  
                            {renderComment(item)}
                            {this.renderSubItems(item, "white", "modal")}
                        </View>                                    
                    )
                })}
                </View> 
        )
        
    }

    toOrderedArray = (orders) => {
        return Object.keys(orders)
        .map((orderKey) => orders[orderKey])
    }

    
    
    recall = (zone, zones) => {
        // console.log("zone appelée", zone)
        const newZone = zone.name === "Toutes" ? zones : [zone]
        
        this.props.dispatch({type:'server/recallOrderV2', order: this.state.orderModal, zone: newZone})
        this.props.navigation.navigate("Home")
        
    }

    renderMainContent = (order) => {  

        const settings = this.props.user.settings || {}
            
        const commentColor = settings.orderCommentColor || "blue"
        
        const renderComment = (comment) => {
            
            if (comment && comment != "") {
                const newComment = comment.replace(/,/g, "\n")
                return(
                    <Text  style={{fontSize: height / 60, color: commentColor, paddingLeft: 5, paddingRight: 5}}>{newComment}</Text>
                )
            }
        }
        return(
            <View style={{flex: 1, backgroundColor: 'white'}}>
                <TouchableOpacity onLongPress={() => this.showModal(order)} style={{flex:1.5,flexDirection: 'row', flexDirection: 'column', flexWrap: 'wrap', borderColor: '#d3d3d3', borderBottomWidth: 1}}>
                    {renderComment(order.comment)}
                    {this.shouldRenderItems(order)}
                </TouchableOpacity>   
                                   
                <TouchableOpacity style={[{flex: 0.75}, styles.center, {backgroundColor: "#A92987"}]} onPress={() => this.setState({modalRecallVisible: !this.state.modalRecallVisible, orderModal: order})}>
                {/* <View style={{backgroundColor: "#A92987" , borderRadius: 2}}> */}
                        <Text style={{fontSize: width / 60, textDecorationLine: 'underline'}}>Rappeler</Text>
                    {/* </View>   */}
                </TouchableOpacity>                        
        </View>
        )        
    }


    shouldRenderItems = (order) => {        
        let count = 0
        const zone = this.props.zone.name
        if (order.comment != "") {
            count ++
        }
        order.items.forEach((item) => {
            if (item.zones.some(e => e.name === zone)) {
                count ++
                if (item.productName.length > 25) {
                    count ++
                }
                if (item.subItems) {
                    item.subItems.forEach((subItem) => {
                        if (subItem.zones.some(e => e.name === zone)) {
                            count ++
                            if (subItem.subProductName.length > 25) {
                                count ++
                            }
                        }
                        
                    })
                }
            } 
            
        })
       if (count < 8){
        return(
            this.renderItems(order)
        )
       } else {
           return(
               <TouchableOpacity style={[{flex:1, width: "100%"}, styles.center]} onPress={() => this.showModal(order)}>
                    <Text style={{textAlign: "center", fontSize: width / 70}}>Afficher la commande</Text>
               </TouchableOpacity>
           )
       }            
    }

    renderOrderSeparator = (i, total) => {
        if (total > 1 && i != total - 1) {
            return(
                <View style={{borderBottomWidth: 1, borderColor: '#d3d3d3' }}></View>
            )
        }
    }

    renderItems = (order) => {
        
        const zone = this.props.zone.name
        let itemsOfZone = order.items.filter(item => item.zones.some(e => e.name === zone) || item.subItems && item.subItems.some(subItem => subItem.zones.some(e => e.name === zone)))
        
        // console.log("itemssss", itemsOfZone)
        return itemsOfZone.map((item, i)=>{  
                const itemView =  item.zones.some(e => e.name === zone) ? <Text  style={{fontSize: height / 60, paddingLeft: 5, paddingRight: 5}}>{item.quantity}  {item.productName}</Text>  : null
                return(    
                    <View style={{flexWrap: 'wrap'}} key={i}>           
                        {itemView}
                        {this.renderSubItems(item, "black")}
                        {this.renderOrderSeparator(i, itemsOfZone.length)}
                    </View>              
                )
            
        })
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

    renderNextPage = (index, total, context) => {
        if (total > 1 && index !== total - 1) {
            return(
                <TouchableOpacity onPress={()=> context.scrollBy(1)}><AntDesign  size={20} style={{color: "white", marginRight: 2, marginLeft: "auto"}} name="caretright"/></TouchableOpacity>
            )
      }
    }

    renderPreviousPage = (index, total, context) => {
        if (total > 1 && index !== 0) {
            return(
                <TouchableOpacity onPress={()=> context.scrollBy(-1)}><AntDesign  size={20} style={{color: "white", marginRight: 2, marginLeft: "auto"}} name="caretleft"/></TouchableOpacity>
            )
      }
    }

   renderPagination = (index, total, context) => {
       
        return(
          <View style={[styles.paginationStyle, {flexDirection: "row"}]}>
              {this.renderPreviousPage(index, total, context)}
          
           
          <Text style={styles.textColor}>
              {index + 1}-{total}
            </Text>
            {this.renderNextPage(index, total, context)}
            
            
          </View>
        )
      }

      renderImage = (order) => {        
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

    disconnect = () => {
        AsyncStorage.removeItem("credentials").then(
            Updates.reloadAsync()
        )
    }

    renderRecallOptions = () => {
        if (Object.keys(this.state.orderModal).length == 0) {
            return null
        }
        const zones = []
        const order = this.state.orderModal
    
        order.items.forEach((item) => {
            item.zones.forEach((zone) => {
                const found = zones.find((element) => element == zone.name)
                if (!found) {
                    
                    zones.push(zone.name)
                } 
            })
            
            if (item.subItems) {
                item.subItems.forEach((subItem) => {
                    
                    subItem.zones.forEach((zoneSub) => {
                        const found = zones.find((element) => element == zoneSub.name)
                        if (!found) {
                            zones.push(zoneSub.name)
                        } 
                    })
                })
            }
        })

        
        
        
        const zonesList = zones.length > 1 ? zones.concat({name: "Toutes", libellé:"Toutes"}) : zones
        // console.log("list", zonesList.libellé)
        const zoneViews = zonesList.map((zone, index) => {
            // console.log("libellé", zone.libellé)
            const allZones = this.props.allZones
            let zoneObj = allZones.find((element) => element.name == zone)
            zoneObj = zoneObj|| {name: "Toutes", libellé:"Toutes"}
            // const text = zoneObj.libellé ? zoneObj.libellé : zoneObj.name
            
                return(
                    <View style={styles.layoutRecall} key={index}>
                        <TouchableOpacity onPress={() => {this.recall(zone, zones)}}>
                            <View style={styles.itemContainer}>
                                <View style={[styles.itemContainerInner]}>
                                    <Text style={styles.textColor}>
                                        {zoneObj.libellé || zoneObj.name}
                                    </Text>                                
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                )
            
            
            
           
        })

        return(
            <View>
                <Text style={styles.textColor}>Choisissez la zone à rappeler</Text>
                <View style={styles.componentFinished}>
                    <View style={styles.layoutsFinished}>
                        {zoneViews}
                    </View>
                </View>
            </View>
           
        )
        
    }

    render() {

        const orders = this.props.finishedOrders        
        const ordersArray = this.toOrderedArray(orders)
        
        let sortedArray = ordersArray.sort(function(a, b) {
            return a.label_id - b.label_id
        })     
        // sortedArray = sortedArray.reverse()        
        let ordersChunks = []      
        const numOfPages = Math.ceil(sortedArray.length / 10)
        
        let myIndex = 0
        let i
        for (i = 0; i < numOfPages; i++) {
            const newArray = sortedArray.slice(myIndex, myIndex + 10)
            ordersChunks.push(newArray)
            myIndex = myIndex + 10
          }
                        
          
        let pageComponents = ordersChunks.map((page, i) => {
            const orderCards = page.map((order, i) => { 

                const hasItem = order.items.some(item => item.zones.some(e => e.name === this.props.zone.name))
                
                // let hasItem = false
                //  for (let i = 0; i < order.items.length; i++) {
                //     hasItem = order.items.some(item => item.zones.some(e => e.name === this.props.zone.name))
                //     if (hasItem) {
                //         break
                //     }
                //   } 

                //   console.log("has", hasItem)
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
                const hourOrder = moment(order.timestamp).format('HH:mm')         
                return(
                    <View key={i} style={styles.layout}>                
                            <View style={styles.itemContainer}>    
                                <View style={{height: height / 10, backgroundColor: "#A92987" }}>
                                    <View style={{flexDirection: "row", justifyContent: "space-between"}}>      
                                        {this.renderImage(order)}                    
                                        <Text style={[ {fontSize: width / 50}]}>#{order.label_id}</Text>
                                        
                                                            
                                    </View>
                                    <View style={{flexDirection: "row", marginBottom: 0, marginTop: "auto", justifyContent: "space-between"}}>                          
                                        <Text style={{fontSize: width / 80, marginBottom: 0, marginTop: "auto"}}>{hourOrder}</Text>
                                        <Text style={{fontSize: width / 80, marginLeft: width / 40, marginRight: "auto", marginBottom: 0, marginTop: "auto"}}>{order.origine}</Text>                                       
                                        <Text style={{fontSize: width / 80}}>{order.name}</Text>                                                            
                                    </View>
                                </View>            
                                
                                {this.renderMainContent(order)}                 
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
            <View style={styles.containerCuisine}> 
                <View style={styles.header}>
                        
                    <View> 
                        <TouchableOpacity onPress={() => this.props.navigation.navigate("Home")}><Text style={[styles.textColor, {fontSize: width / 45}]}>Commandes en cours</Text></TouchableOpacity>
                    </View>
                    <View style={{paddingRight: 10, paddingLeft: 10}}>
                        <TouchableOpacity onPress={() => this.props.navigation.navigate("History")}><Text style={[styles.textColor, {textDecorationLine: 'underline', fontSize: width / 45}]}>Commandes terminées</Text></TouchableOpacity>
                    </View>
                    

                    
                </View>      
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
                <Modal
                    isVisible={this.state.modalRecallVisible}
                    onBackdropPress={() => this.setState({ modalRecallVisible: false })}                     

                    backdropColor={"black"}
                    backdropOpacity={0.7}
                    style={styles.modal}
                    >
                    <View contentContainerStyle={[{alignItems: 'center', flexWrap: 'wrap'}]}>
                        {this.renderRecallOptions()}
                    </View>                
                </Modal>
                <Swiper loop={false} renderPagination={this.renderPagination}>
                    {pageComponents}
                </Swiper>
                <View style={{marginRight: width / 20, marginLeft: "auto", marginBottom: height / 100, marginTop: "auto" }}>
                        <TouchableOpacity onPress={() => {this.disconnect()}}><Text style={[styles.textColor, {textDecorationLine: 'underline', fontSize: width / 60}]}>Déconnexion</Text></TouchableOpacity>
                </View>
                
            </View>           
        )         
        
    }
}

function mapStateToProps(state) {
    return {
      finishedOrders: state.finishedOrders, 
      orders: state.orders,  
      zone: state.zone,
      user: state.user,
      allZones: state.allZones
    }
  }
  
  export default connect(mapStateToProps)(History);