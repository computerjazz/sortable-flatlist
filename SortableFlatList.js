import React, { Component, PureComponent } from 'react'
import { LayoutAnimation, YellowBox, Animated, FlatList, View, TouchableOpacity, PanResponder, Text } from 'react-native'

YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated'])

class SortableFlatList extends Component {
  _hoverAnim = new Animated.Value(0)

  constructor(props) {
    super(props)

    this._panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { activeRow } = this.state 
        const shouldSet = activeRow > -1
        if (shouldSet) {
          const mouseItemOffset = evt.nativeEvent.locationY
          const additionalOffset =  mouseItemOffset
          const hoverItemTopPosition = gestureState.moveY - additionalOffset - this._containerOffset 
          
          this._hoverAnim.setValue(hoverItemTopPosition)
          const spacerIndex = this.getSpacerIndex(gestureState, activeRow, additionalOffset)
       
          this.setState({
            additionalOffset,
            spacerIndex,
            showHoverComponent: true,
          })
        }
        return shouldSet;
      },
      onPanResponderMove: (evt, gestureState) => {
        const { spacerIndex, activeRow, additionalOffset } = this.state
        const hoverItemTopPosition = gestureState.moveY - additionalOffset - this._containerOffset 
        const nextSpacerIndex = this.getSpacerIndex(gestureState, activeRow, additionalOffset)
        
        if (nextSpacerIndex > -1 && nextSpacerIndex !== spacerIndex ) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.spring)
          this.setState({ spacerIndex: nextSpacerIndex })
        }
        this._hoverAnim.setValue(hoverItemTopPosition)
      },
      onPanResponderRelease: () => {
        const { activeRow, spacerIndex } = this.state
        const sortedData = this.props.data.reduce(( acc, cur, i, arr ) => {
          if (i === activeRow) {
            if (activeRow === spacerIndex) acc.push(cur)
            return acc
          }else if (i === spacerIndex) {
            if (activeRow > spacerIndex) {
              acc.push(arr[activeRow])
              acc.push(cur)
            } else {
              acc.push(cur)
              acc.push(arr[activeRow])
            }
          } else acc.push(cur)
          

          return acc
        }, [])
        this.props.onDataSorted(sortedData)
        this._hoverAnim.setValue(0)
        this.setState(state => ({
          activeRow: -1,
          showHoverComponent: false,
          spacerIndex: -1,
        }))
      }
    })

    this.state = {
      activeRow: -1,
      spacerIndex: -1,
      showHoverComponent: false,
    }
  }

  getSpacerIndex = (gestureState, activeRow, additionalOffset) => {
    if (activeRow === -1 || !this._measurements[activeRow]) return -1
    // find the row that contains the midpoint of the hovering item
    const hoverItemHeight = this._measurements[activeRow].height
    const hoverItemMidpoint = gestureState.moveY - additionalOffset + hoverItemHeight / 2
    const hoverY = hoverItemMidpoint + this._scrollOffset
    return this._measurements.findIndex(({ height, y }) => {
      return (hoverY > y) && (hoverY <= y + height)
    })
  }

  _rowClones = []
  _measurements = []
  _scrollOffset = 0
  _additionalOffset = 0
  _refs = []

  measureItem = (ref, index) => {
    if (this._measurements[index]) return
    ref && setTimeout(() => {
      ref.measureInWindow(((x, y, width, height) => {
        if (!this._measurements[index] && (width || height)) this._measurements[index] = {
          x,
          y,
          width,
          height,
        }
      }))
    })
  }

  renderItem = ({ item, index }) => {
    const { activeRow, spacerIndex, showHoverComponent } = this.state
    const isActiveRow = showHoverComponent && activeRow === index
    const isSpacerRow = showHoverComponent && spacerIndex === index
    
    const component = <RowItem
      itemRef={ref => this.measureItem(ref, index)}
      item={item}
      onLongPress={() => {
        this.hoverComponent = this._rowClones[index]
        this.setState({ activeRow: index })
      }}
      style={{ height: 30, width: 200, backgroundColor: `rgb(${item.color}, ${item.color}, ${item.color})`
      }}
    />

    this._rowClones[index] = React.cloneElement(component)

    return (
      <View>
        {isSpacerRow && (activeRow >= index) && this.renderSpacer(this._measurements[activeRow].height)}

      <View style={{ height: isActiveRow ? 0 : undefined }}>
        {component}
      </View>

        {isSpacerRow && (activeRow < index) && this.renderSpacer(this._measurements[activeRow].height)}
       </View>
    )
  }

  renderSpacer = (height) =>  <View style={{ height }} />

  renderHoverComponent = () => {
    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: this._hoverAnim
        }}
      >
        {this.hoverComponent}
      </Animated.View>
    )
  }

  render() {
    const { showHoverComponent } = this.state
    return (
      <View
      ref={ref => {
        if (ref && !this._containerOffset) {
          ref.measure((x, y, width, height, pageX, pageY) => this._containerOffset = pageY)
        }
      }}
        {...this._panResponder.panHandlers}
        style={{ backgroundColor: '#efefef', flex: 1 }}
      >
        <FlatList
          ref={ref => this._flatList = ref}
          data={this.props.data}
          renderItem={this.renderItem}
          keyExtractor={(item, index) => `item-${index}`}
          extraData={this.state}
          windowSize={21}
          initialNumToRender={this.props.data.length}
          onScroll={e => {
            this._scrollOffset = e.nativeEvent.contentOffset.y
          }}
          scrollEventThrottle={16}
        />
        {showHoverComponent && this.renderHoverComponent()}
      </View>
    )
  }
}

export default SortableFlatList

class RowItem extends PureComponent {
  render() {
    const { itemRef, onLongPress, style, item } = this.props
    return (
      <TouchableOpacity
        ref={itemRef}
        onLongPress={onLongPress}
        style={style}
    >
        <Text>{item.label}</Text>
      </TouchableOpacity>
    )
  }
}