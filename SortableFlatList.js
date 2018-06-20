import React, { Component, PureComponent } from 'react'
import { 
  LayoutAnimation, 
  YellowBox, 
  Animated, 
  FlatList, 
  View, 
  PanResponder, 
  UIManager,
  StyleSheet,
} from 'react-native'

// Measure function triggers false positives
YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated'])
UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);

const initialState = {
  activeRow: -1,
  showHoverComponent: false,
  spacerIndex: -1,
  scroll: false,
  hoverComponent: null,
}

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
  _hasMoved = false
  _refs = []
  _additionalOffset = 0
  
  constructor(props) {
    super(props)
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt, gestureState) => {
        const { pageY } = evt.nativeEvent
        const tappedRow = this._pixels[Math.floor(this._scrollOffset + pageY)]
        this._additionalOffset = (pageY + this._scrollOffset) - this._measurements[tappedRow].y
        this._moveYAnim.setValue(pageY)
        this._moveY = pageY
        this._offset.setValue((this._additionalOffset + this._containerOffset) * -1)
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
          this._hasMoved = true
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
        const { data } = this.props 
        const activeMeasurements = this._measurements[activeRow]
        const spacerMeasurements = this._measurements[spacerIndex]
        const lastElementMeasurements = this._measurements[data.length - 1]
        const sortedData = this.getSortedList(this.props.data, activeRow, spacerIndex)

        // If user flings row up and lets go in the middle of an animation
        // measurements can error out. Give layout animations some time to complete
        // and animate element into place before calling onMoveEnd
        const isAfterActive = spacerIndex > activeRow
        const isLastElement = spacerIndex >= data.length
        const spacerElement = isLastElement ? lastElementMeasurements : spacerMeasurements
        const ypos = spacerElement.y - this._scrollOffset + this._additionalOffset + (isLastElement ? spacerElement.height : 0)
        Animated.spring(this._moveYAnim, {
          toValue: ypos - (isAfterActive ? activeMeasurements.height : 0),
          stiffness: 1000,
          damping: 500,
          mass: 3,
          useNativeDriver: true,
        }).start((() => {
          this._spacerIndex = -1
          this.setState(initialState)
          this._hasMoved = false
          this._moveY = 0
          this.props.onMoveEnd && this.props.onMoveEnd({
            row: this.props.data[activeRow],
            from: activeRow,
            to: spacerIndex,
            data: sortedData,
          })

        }))
      }
    })
    this.state = initialState
  }

  scroll = (scrollAmt, spacerIndex) => {
    if (spacerIndex >= this.props.data.length - 2) return
    if (spacerIndex === 0) return this._flatList.scrollToIndex({ index: 0 })
    const isScrollingUp = scrollAmt > 0
    const currentScrollOffset = this._scrollOffset
    const newOffset = currentScrollOffset + scrollAmt
    const offset = isScrollingUp ? Math.max(0, newOffset) : newOffset
    this._flatList.scrollToOffset({ offset, animated: false })
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
    if (spacerIndex >= data.length) sortedData.push(data[activeRow])
    return sortedData
  }

  animate = () => {
    const { activeRow } = this.state
    if (activeRow === -1) return
    const hoverItemTopPosition = this._moveY - (this._additionalOffset + this._containerOffset)
    const hoverItemBottomPosition = hoverItemTopPosition + this._measurements[activeRow].height
    const nextSpacerIndex = this.getSpacerIndex(this._moveY, activeRow)
    if (nextSpacerIndex > -1 && nextSpacerIndex !== this._spacerIndex) {
      LayoutAnimation.easeInEaseOut()
      this.setState({ spacerIndex: nextSpacerIndex })
      this._spacerIndex = nextSpacerIndex
    }
    // scroll if in top or bottom 5%
    const shouldScrollUp = hoverItemTopPosition < (this._containerHeight * 0.05)
    const shouldScrollDown = hoverItemBottomPosition > (this._containerHeight * 0.95)

    if (shouldScrollUp) this.scroll(-5, nextSpacerIndex)
    else if (shouldScrollDown) this.scroll(5, nextSpacerIndex)
    requestAnimationFrame(this.animate)
  }


  getSpacerIndex = (moveY, activeRow) => {
    if (activeRow === -1 || !this._measurements[activeRow]) return -1
    // find the row that contains the midpoint of the hovering item
    const hoverItemHeight = this._measurements[activeRow].height
    const hoverItemMidpoint = moveY - this._additionalOffset + hoverItemHeight / 2
    const hoverY = Math.floor(hoverItemMidpoint + this._scrollOffset)
    let spacerIndex = this._pixels[hoverY]
    if (spacerIndex === undefined) {
      // Fallback in case we can't find index in _pixels array
      spacerIndex = this._measurements.findIndex(({ height, y }) => {
        return hoverY > y && hoverY < (y + height)
      })
    }
    return spacerIndex > activeRow ? spacerIndex + 1 : spacerIndex
  }

  measureItem = (ref, index) => {
    this._refs[index] = ref
    const { activeRow } = this.state  
    !!ref && setTimeout(() => {
      try {
        this._refs[index].measureInWindow(((x, y, width, height) => {
          if (y >= 0 && (width || height) && activeRow === -1) {
            const ypos = y + this._scrollOffset
            const rowMeasurements = { y: ypos, height }
            this._measurements[index] = rowMeasurements
            for (let i = Math.floor(ypos); i < ypos + height; i++) {
              this._pixels[i] = index
            }
          }
        }))

      } catch (e) {
        console.log('## measure error -- index: ', index, activeRow, ref, e)
      }
    }, 100)
  }

  move = (hoverComponent, index) => {
    this._spacerIndex = index
    this.setState({
      activeRow: index,
      spacerIndex: index,
      hoverComponent,
    })
  }

  moveEnd = () => {
    if (!this._hasMoved) this.setState(initialState)
  }

  setRef = index => (ref) => this.measureItem(ref, index)

  renderItem = ({ item, index }) => {
    const { renderItem, data } = this.props
    const { activeRow, spacerIndex } = this.state
    const isSpacerRow = spacerIndex === index
    onLayout = this.onLayout
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
        moveEnd={this.moveEnd}
        bottomPadding={bottomPadding}
      />
    )
  }

  renderHoverComponent = () => {
    const { hoverComponent } = this.state
    return !!hoverComponent && (
      <Animated.View style={[styles.hoverComponent, { transform: [{ translateY: this._hoverAnim }] }]} >
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
      }, 50)
    }
  }

  render() {
    return (
      <View
      onLayout={e => console.log('layout', e.nativeEvent)}
      ref={this.measureContainer}
        {...this._panResponder.panHandlers}
        style={{ flex: 1, opacity: 1 }}
      >
        <FlatList
         scrollEnabled={this.state.activeRow === -1}
          ref={ref => this._flatList = ref}
          data={this.props.data}
          renderItem={this.renderItem}
          extraData={this.state}
          keyExtractor={( item ) => item.key}
          onScroll={({ nativeEvent }) => this._scrollOffset = nativeEvent.contentOffset.y}
          scrollEventThrottle={16}
        />
        {this.renderHoverComponent()}
      </View>
    )
  }
}

export default SortableFlatList

class RowItem extends PureComponent {

  renderSpacer = (height) => <View style={{ height }} />

  move = () => {
    const { move, moveEnd, renderItem, item, index } = this.props
    const hoverComponent = renderItem({ isActive: true, item, index, move: () => null, moveEnd })
    move(hoverComponent, index)
  }

  render() {
    const { moveEnd, isActiveRow, bottomPadding, spacerHeight, renderItem, item, index, setRef } = this.props
    const component = renderItem({ 
      isActive: false, 
      item, 
      index, 
      move: this.move,
      moveEnd,
    })
    
    return (
      <View ref={setRef(index)} style={{ opacity: 1 }}>
      {!!spacerHeight && this.renderSpacer(spacerHeight)}
        <View style={{ 
          opacity: isActiveRow ? 0 : 1,
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

const styles = StyleSheet.create({
  hoverComponent: {
    position: 'absolute',
    left: 0,
    right: 0,
  }
})