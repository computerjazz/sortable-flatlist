import React, { Component, PureComponent } from 'react'
import { 
  LayoutAnimation, 
  YellowBox, 
  Animated, 
  FlatList, 
  View, 
  TouchableOpacity, 
  PanResponder, 
  Text,
} from 'react-native'

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
          const spacerIndex = this.getSpacerIndex(gestureState.moveY, activeRow, additionalOffset)
       
          this.setState({
            additionalOffset,
            spacerIndex,
            showHoverComponent: true,
          })
        }
        return shouldSet;
      },
      onPanResponderMove: (evt, gestureState) => {
        const { spacerIndex, activeRow, additionalOffset, scroll } = this.state
        const hoverItemTopPosition = gestureState.moveY - additionalOffset - this._containerOffset 
        const nextSpacerIndex = this.getSpacerIndex(gestureState.moveY, activeRow, additionalOffset)
        
        if (nextSpacerIndex > -1 && nextSpacerIndex !== spacerIndex ) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.spring)
          this.setState({ spacerIndex: nextSpacerIndex })

          // scroll if in top or bottom 10%
            const yPos = gestureState.moveY - this._containerOffset
            const shouldScrollUp = yPos < (this._containerHeight * 0.1)
            const shouldScrollDown = yPos > (this._containerHeight * 0.9)
            if (!scroll && shouldScrollUp) this.setState({ scroll: 'up', touchY: gestureState.moveY }, () => this.scroll())
            else if (!scroll && shouldScrollDown) this.setState({ scroll: 'down', touchY: gestureState.moveY }, () => this.scroll())
            else if (scroll && !shouldScrollDown && !shouldScrollUp) this.setState({ scroll: false })
        }

        this._hoverAnim.setValue(hoverItemTopPosition)
      },
      onPanResponderRelease: () => {
        const { activeRow, spacerIndex } = this.state
        const sortedData = this.assembleSortedData(this.props.data, activeRow, spacerIndex)
        this.props.onDataSorted(sortedData)
        this._hoverAnim.setValue(0)
        this.setState(state => ({
          activeRow: -1,
          showHoverComponent: false,
          spacerIndex: -1,
          scroll: false,
          touchY: 0,
        }))
      }
    })

    this.state = {
      activeRow: -1,
      spacerIndex: -1,
      showHoverComponent: false,
      scroll: false,
      touchY: 0,
    }
  }

  scroll = () => {
    const { scroll, touchY, activeRow, additionalOffset } = this.state
    if (!scroll) return
    const scrollingUp = scroll === 'up'
    const currentScrollOffset = this._scrollOffset
    const incrementAmt = scrollingUp ? - 30 : 30
    const newOffset = currentScrollOffset + incrementAmt
    const offset = scrollingUp ? Math.max(0, newOffset) : newOffset

    this._flatList.scrollToOffset({ offset })

    const spacerIndex = this.getSpacerIndex(touchY + incrementAmt, activeRow, additionalOffset)
    if (spacerIndex >= this.props.data.length - 1 || spacerIndex === 0) this.setState({ scroll: false })
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring)
    this.setState({ spacerIndex })

    setTimeout(() => this.scroll(), 250)
  }

  assembleSortedData = (data, activeRow, spacerIndex) => {
    return data.reduce((acc, cur, i, arr) => {
      if (i === activeRow) {
        if (activeRow === spacerIndex) acc.push(cur)
        return acc
      } else if (i === spacerIndex) {
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
  }

  getSpacerIndex = (moveY, activeRow, additionalOffset) => {
    if (activeRow === -1 || !this._measurements[activeRow]) return -1
    // find the row that contains the midpoint of the hovering item
    const hoverItemHeight = this._measurements[activeRow].height
    const hoverItemMidpoint = moveY - additionalOffset + hoverItemHeight / 2
    const hoverY = hoverItemMidpoint + this._scrollOffset
    return this._measurements.findIndex(({ height, y }) => {
      return (hoverY > y) && (hoverY <= y + height)
    })
  }

  _rowClones = []
  _measurements = []
  _scrollOffset = 0
  _additionalOffset = 0

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
      style={{ 
        height: 30, 
        width: '100%', 
        backgroundColor: `rgb(${item.color}, ${item.color}, ${item.color})`
      }}
    />

    this._rowClones[index] = React.cloneElement(component)
    return (
      <View>
        {isSpacerRow && (activeRow >= index) && this.renderSpacer(this._measurements[activeRow].height)}
      <View style={{ 
        height: isActiveRow ? 0 : undefined, 
        opacity: isActiveRow ? 0 : 1, 
      }}>
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
          left: 0,
          right: 0,
          top: this._hoverAnim,
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
          setTimeout(() => {
            ref.measure((x, y, width, height, pageX, pageY) => {
              this._containerOffset = pageY
              this._containerHeight = height
          })
        })
      }}}
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