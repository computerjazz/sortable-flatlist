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

const springConfig = {
  duration: 500,
  create: {
    type: LayoutAnimation.Types.spring,
    property: LayoutAnimation.Properties.opacity,
    springDamping: 0.8,
  },
  update: {
    type: LayoutAnimation.Types.spring,
    property: LayoutAnimation.Properties.opacity,
    springDamping: 0.8,
  },
  delete: {
    type: LayoutAnimation.Types.spring,
    property: LayoutAnimation.Properties.opacity,
    springDamping: 0.8,
  },
};

class SortableFlatList extends Component {
  _hoverAnim = new Animated.Value(0)

  constructor(props) {
    super(props)

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt, gestureState) => {
        this.additionalOffset = evt.nativeEvent.locationY
        const hoverItemTopPosition = evt.nativeEvent.pageY - this.additionalOffset - this._containerOffset

        this._hoverAnim.setValue(hoverItemTopPosition)
        return false
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { activeRow } = this.state 
        const shouldSet = activeRow > -1

        if (shouldSet) {
          this.additionalOffset = evt.nativeEvent.locationY
          const hoverItemTopPosition = gestureState.moveY - this.additionalOffset - this._containerOffset 
          this._hoverAnim.setValue(hoverItemTopPosition)
          this.props.onRowActive && this.props.onRowActive(activeRow)
          this.setState({ showHoverComponent: true })
        }
        return shouldSet;
      },
      onPanResponderMove: (evt, gestureState) => {
        const { spacerIndex, activeRow, scroll } = this.state
        const hoverItemTopPosition = gestureState.moveY - this.additionalOffset - this._containerOffset 
        this._hoverAnim.setValue(hoverItemTopPosition)

        const nextSpacerIndex = this.getSpacerIndex(gestureState.moveY, activeRow, this.additionalOffset)
        
        if (nextSpacerIndex > -1 && nextSpacerIndex !== spacerIndex ) {
          this.setState({ spacerIndex: nextSpacerIndex })

          // scroll if in top or bottom 10%
            const shouldScrollUp = hoverItemTopPosition < (this._containerHeight * 0.1)
            const shouldScrollDown = hoverItemTopPosition + this._measurements[activeRow].height > (this._containerHeight * 0.9)
            
            if (!scroll) {
              if (shouldScrollUp) this.setState({ scroll: true, touchY: gestureState.moveY }, () => this.scroll(-50))
              if (shouldScrollDown) this.setState({ scroll: true, touchY: gestureState.moveY }, () => this.scroll(50))
            } else if (!shouldScrollDown && !shouldScrollUp) this.setState({ scroll: 0 })
        }
      },
      onPanResponderRelease: () => {
        const { activeRow, spacerIndex } = this.state
        const sortedData = this.assembleSortedData(this.props.data, activeRow, spacerIndex)
        this.props.onMoveEnd && this.props.onMoveEnd({
          row: this.props.data[activeRow],
          from: activeRow,
          to: spacerIndex,
          data: sortedData,
        })
        this._hoverAnim.setValue(0)
        this.setState({
          activeRow: -1,
          showHoverComponent: false,
          spacerIndex: -1,
          scroll: false,
          touchY: 0,
          hoverComponent: null,
        })
      }
    })

    this.state = {
      activeRow: -1,
      spacerIndex: -1,
      showHoverComponent: false,
      scroll: false,
      touchY: 0,
      hoverComponent: null,
    }
  }

  scroll = (scrollAmt) => {
    const { scroll, touchY, activeRow } = this.state
    if (!scroll) return
    const scrollingUp = scrollAmt > 0
    const currentScrollOffset = this._scrollOffset
   
    const newOffset = currentScrollOffset + scrollAmt
    const offset = scrollingUp ? Math.max(0, newOffset) : newOffset

    this._flatList.scrollToOffset({ offset })

    const spacerIndex = this.getSpacerIndex(touchY + scrollAmt, activeRow, this.additionalOffset)
    if (spacerIndex >= this.props.data.length - 1 || spacerIndex <= 0) this.setState({ scroll: false })
    // LayoutAnimation.configureNext(springConfig)
    this.setState({ spacerIndex })

    setTimeout(() => this.scroll(scrollAmt), 200)
  }

  assembleSortedData = (data, activeRow, spacerIndex) => {
    if (activeRow === spacerIndex) return data
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

  componentDidUpdate(prevProps, prevState) {
    if (prevState.spacerIndex !== this.state.spacerIndex && this.state.spacerIndex !== -1 && Platform.OS === 'ios') {
      LayoutAnimation.easeInEaseOut()
    }
  }

  getSpacerIndex = (moveY, activeRow, additionalOffset) => {
    if (activeRow === -1 || !this._measurements[activeRow]) return -1
    // find the row that contains the midpoint of the hovering item
    const hoverItemHeight = this._measurements[activeRow].height
    const hoverItemMidpoint = moveY - this.additionalOffset + hoverItemHeight / 2
    const hoverY = hoverItemMidpoint + this._scrollOffset
    return this._measurements.findIndex(m => {
      if (!m) return false
      const { height, y } = m
      return (hoverY > y) && (hoverY <= y + height)
    })
  }

  _measurements = []
  _scrollOffset = 0
  _containerHeight
  _containerOffset

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

  _components = {}

  renderItem = ({ item, index }) => {
    const { renderItem } = this.props
    const { activeRow, spacerIndex } = this.state
    const isSpacerRow = spacerIndex === index

    move = () => {
      this.setState({ 
        activeRow: this.props.data.findIndex(d => d.key === item.key), 
        spacerIndex: this.props.data.findIndex(d => d.key === item.key), 
        hoverComponent: this._components[item.key].active 
      })
    }

    const setRef = ref => this.measureItem(ref, index)

    const component = this._components[item.key]
    if (!component) {
      this._components[item.key] = {
        active: renderItem({ isActive: true, item, index, setRef, move }),
        inactive: renderItem({ isActive: false, item, index, setRef, move })
      }
    }

    const spacerHeight = (isSpacerRow && this._measurements[activeRow]) ? this._measurements[activeRow].height : 0
    
    return (
      <RowItem
        key={`row-${index}`}
        index={index}
        isActiveRow={activeRow === index}
        isBeforeActiveRow={activeRow > index}
        spacerHeight={spacerHeight}
        isSpacerRow={isSpacerRow}
        component={this._components[item.key].inactive}
      />
    )
  }

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
        {!!this.state.hoverComponent && this.state.hoverComponent}
      </Animated.View>
    )
  }

  measureContainer = ref => {
    if (ref && this._containerOffset === undefined) {
      setTimeout(() => {
        ref.measure((x, y, width, height, pageX, pageY) => {
          console.log('MEASURE', x, y, width, height, pageX, pageY)
          this._containerOffset = pageY
          this._containerHeight = height
        })
      }, 0)
    }
  }

  render() {
    console.log('flatlist render')
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
          onScroll={e => {
            this._scrollOffset = e.nativeEvent.contentOffset.y
          }}
          scrollEventThrottle={16}
        />
        {this.renderHoverComponent()}
        <View style={{
          position: 'absolute',
          top: 20,
          left: 0,
          width: 150,
          height: 150,
          backgroundColor: 'white'
        }}>
          <Text>{`Active: ${this.state.activeRow}`}</Text>
          <Text>{`Spacer: ${this.state.spacerIndex}`}</Text>
          <Text>{`Offset: ${this.additionalOffset}`}</Text>
          <Text>{`Container height: ${this._containerHeight}`}</Text>
          <Text>{`ContainerOffset: ${this._containerOffset}`}</Text>
        </View>
      </View>
    )
  }
}

export default SortableFlatList

class RowItem extends PureComponent {

  renderSpacer = (height) => <View style={{ height }} />

  render() {
    console.log('rowitem render')
    const { component, isActiveRow, isSpacerRow, isBeforeActiveRow ,spacerHeight} = this.props
    return (
      <View>
        {isSpacerRow && !!isBeforeActiveRow && this.renderSpacer(spacerHeight)}
        <View style={{
          height: isActiveRow ? 0 : undefined,
          opacity: isActiveRow ? 0.5 : 1,
        }}>
          {component}
        </View>
        {isSpacerRow && !isBeforeActiveRow && this.renderSpacer(spacerHeight)}
      </View>
    )
  }
}