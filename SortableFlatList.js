import React, { Component, PureComponent } from 'react'
import { 
  LayoutAnimation, 
  YellowBox, 
  Animated, 
  FlatList, 
  View, 
  PanResponder, 
  UIManager,
  Platform,
  Text,
} from 'react-native'

// Measure function triggers false positives
YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated'])
UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);

class SortableFlatList extends Component {
  _moveYAnim = new Animated.Value(0)
  _offset = new Animated.Value(0)
  _hoverAnim = Animated.add(this._moveYAnim, this._offset)
  _spacerIndex = -1
  _pixels = []
  _measurements = []
  _scrollOffset = 0
  _containerHeight
  _containerOffset
  _moveY = 0
  
  constructor(props) {
    super(props)
    const initialState = {
      activeRow: -1,
      showHoverComponent: false,
      spacerIndex: -1,
      scroll: false,
      moveY: 0,
      hoverComponent: null,
    }

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt, gestureState) => {
        this.additionalOffset = evt.nativeEvent.locationY
        this._moveYAnim.setValue(evt.nativeEvent.pageY)
        this._offset.setValue((this.additionalOffset + this._containerOffset) * -1)
        return false
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { activeRow } = this.state 
        const shouldSet = activeRow > -1
        this._moveYAnim.setValue(gestureState.moveY)
        if (shouldSet) {
          this.props.onRowActive && this.props.onRowActive(activeRow)
          this.setState({ showHoverComponent: true })
          this.animate()
        }
        return shouldSet;
      },
      onPanResponderMove: Animated.event([ null, { moveY: this._moveYAnim }], {
        listener: (evt, gestureState) => {
          const { moveY } = gestureState
          this._moveY = moveY
        }
      }),
      onPanResponderRelease: () => {
        const { activeRow, spacerIndex } = this.state
        const sortedData = this.getSortedList(this.props.data, activeRow, spacerIndex)
        this.props.onMoveEnd && this.props.onMoveEnd({
          row: this.props.data[activeRow],
          from: activeRow,
          to: spacerIndex,
          data: sortedData,
        })
        this.setState(initialState)
      }
    })
    this.state = initialState
  }

  scroll = (scrollAmt) => {
    const { scroll, activeRow } = this.state
    const spacerIndex = this.getSpacerIndex(this._moveY + scrollAmt, activeRow)

    if (!scroll ||   spacerIndex >= this.props.data.length - 2) return
    if (spacerIndex === 0) return this._flatList.scrollToIndex({ index: 0 })
    const isScrollingUp = scrollAmt > 0
    const currentScrollOffset = this._scrollOffset
   
    const newOffset = currentScrollOffset + scrollAmt
    const offset = isScrollingUp ? Math.max(0, newOffset) : newOffset
    this._flatList.scrollToOffset({ offset })
    if (spacerIndex >= this.props.data.length - 1 || spacerIndex <= 0) this.setState({ scroll: false })
    this.setState({ spacerIndex })
    setTimeout(() => this.scroll(scrollAmt), 200)
  }

  getSortedList = (data, activeRow, spacerIndex) => {
    if (activeRow === spacerIndex) return data
    const sortedData = data.reduce((acc, cur, i, arr) => {
      if (i === activeRow) return acc
      else if (i === spacerIndex) {
        acc.push(arr[activeRow])
        acc.push(cur)
      } else acc.push(cur)
      return acc
    }, [])
    if (spacerIndex === data.length) sortedData.push(data[activeRow])
    return sortedData
  }

  animate = () => {
    if (this.state.activeRow === -1) return
    const { activeRow, scroll } = this.state
    const hoverItemTopPosition = this._moveY - this.additionalOffset - this._containerOffset
    const nextSpacerIndex = this.getSpacerIndex(this._moveY, activeRow)
    if (nextSpacerIndex > -1 && nextSpacerIndex !== this._spacerIndex) {
      LayoutAnimation.easeInEaseOut()
      this.setState({ spacerIndex: nextSpacerIndex })
      this._spacerIndex = nextSpacerIndex
      // scroll if in top or bottom 10%
      const shouldScrollUp = hoverItemTopPosition < (this._containerHeight * 0.1)
      const shouldScrollDown = hoverItemTopPosition + this._measurements[activeRow].height > (this._containerHeight * 0.9)

      if (!scroll) {
        if (shouldScrollUp) this.setState({ scroll: true, moveY: this._moveY }, () => this.scroll(-50))
        if (shouldScrollDown) this.setState({ scroll: true, moveY: this._moveY }, () => this.scroll(50))
      } else if (!shouldScrollDown && !shouldScrollUp) this.setState({ scroll: 0 })
    }
    requestAnimationFrame(this.animate)
  }


  getSpacerIndex = (moveY, activeRow) => {
    if (activeRow === -1 || !this._measurements[activeRow]) return -1
    // find the row that contains the midpoint of the hovering item
    const hoverItemHeight = this._measurements[activeRow].height
    const hoverItemMidpoint = moveY - this.additionalOffset + hoverItemHeight / 2
    const hoverY = Math.floor(hoverItemMidpoint + this._scrollOffset)
    let spacerIndex = this._pixels[hoverY]
    if (spacerIndex === undefined) {
      spacerIndex = this._measurements.findIndex(({ height, y }) => {
        return hoverY > y && hoverY < (y + height)
      })
    }
    return spacerIndex > activeRow ? spacerIndex + 1 : spacerIndex
  }

  measureItem = (ref, index) => {
    if (this._measurements[index]) return
    ref && setTimeout(() => {
      ref.measureInWindow(((x, y, width, height) => {
        if (!this._measurements[index] && (width || height)) {
          this._measurements[index] = { x, y, width, height }
          for (let i = Math.floor(y); i < y + height; i++) {
            this._pixels[i] = index
          }
        }
        }))
    }, 10)
  }

  _components = {}

  move = (hoverComponent, index) => {
    this.setState({
      activeRow: index,
      spacerIndex: index,
      hoverComponent,
    })
  }

  setRef = index => (ref) => this.measureItem(ref, index)

  renderItem = ({ item, index }) => {
    const { renderItem, data } = this.props
    const { activeRow, spacerIndex } = this.state
    const isSpacerRow = spacerIndex === index
    const spacerHeight = (isSpacerRow && this._measurements[activeRow]) ? this._measurements[activeRow].height : 0
    const bottomPadding = index === data.length - 1 && spacerIndex === data.length && this._measurements[activeRow].height
    return (
      <RowItem
        key={`row-${index}`}
        index={index}
        isActiveRow={activeRow === index}
        spacerHeight={spacerHeight}
        renderItem={renderItem}
        item={item}
        setRef={this.setRef}
        move={this.move}
        bottomPadding={bottomPadding}
      />
    )
  }

  renderHoverComponent = () => {
    const { hoverComponent } = this.state
    return !!hoverComponent && (
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: this._hoverAnim,
        }}
      >
        {hoverComponent}
      </Animated.View>
    )
  }

  measureContainer = ref => {
    if (ref && this._containerOffset === undefined) {
      setTimeout(() => {
        ref.measure((x, y, width, height, pageX, pageY) => {
          this._containerOffset = pageY
          this._containerHeight = height
        })
      }, 0)
    }
  }

  render() {
    return (
      <View
      onLayout={e => console.log('layout', e.nativeEvent)}
      ref={this.measureContainer}
        {...this._panResponder.panHandlers}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={ref => this._flatList = ref}
          data={this.props.data}
          renderItem={this.renderItem}
          extraData={this.state}
          windowSize={21}
          keyExtractor={( item ) => item.key}
          initialNumToRender={this.props.data.length}
          onScroll={({ nativeEvent }) => this._scrollOffset = nativeEvent.contentOffset.y}
          scrollEventThrottle={16}
        />
        {this.renderHoverComponent()}
        <View style={{
          position: 'absolute',
          top: 20,
          left: 0,
          width: 150,
          flex: 1,
          backgroundColor: 'white'
        }}>
          <Text>{`Active: ${this.state.activeRow}`}</Text>
          <Text>{`Spacer: ${this.state.spacerIndex}`}</Text>
          <Text>{`Offset: ${this.additionalOffset}`}</Text>
          <Text>{`MoveY: ${this.state.moveY}`}</Text>
          <Text>{`Container height: ${this._containerHeight}`}</Text>
          <Text>{`ContainerOffset: ${this._containerOffset}`}</Text>
          <Text>{`ScrollOffset: ${this._scrollOffset}`}</Text>
          <Text>{`DataLength: ${this.props.data.length}`}</Text>

        </View>
      </View>
    )
  }
}

export default SortableFlatList

class RowItem extends PureComponent {

  renderSpacer = (height) => <View style={{ height }} />

  move = () => {
    const { move, renderItem, item, index, setRef } = this.props
    const hoverComponent = renderItem({ isActive: true, item, index, setRef: setRef(index), move: () => null})
    move(hoverComponent, index)
  }

  render() {
    const { isActiveRow, bottomPadding, spacerHeight, renderItem, item, index, setRef } = this.props
    const component = renderItem({ 
      isActive: false, 
      item, 
      index, 
      setRef: setRef(index), 
      move: this.move 
    })
    
    return (
      <View>
      {!!spacerHeight && this.renderSpacer(spacerHeight)}
        <View style={{ 
          height: isActiveRow ? 0 : undefined, 
          overflow: 'hidden'
        }}>
          {component}
        </View>
        {!!bottomPadding && this.renderSpacer(bottomPadding)}

      </View>
    )
  }
}