import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Keyboard } from '@capacitor/keyboard'

export const useMobile = () => {
  const [isNative, setIsNative] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform())

    if (Capacitor.isNativePlatform()) {
      // Configure status bar
      StatusBar.setStyle({ style: Style.Dark })
      StatusBar.setBackgroundColor({ color: '#8B5CF6' })

      // Hide splash screen after app loads
      SplashScreen.hide()

      // Handle keyboard
      const keyboardWillShow = Keyboard.addListener('keyboardWillShow', info => {
        setKeyboardHeight(info.keyboardHeight)
      })

      const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0)
      })

      return () => {
        keyboardWillShow.remove()
        keyboardWillHide.remove()
      }
    }
  }, [])

  return {
    isNative,
    keyboardHeight,
    platform: Capacitor.getPlatform()
  }
}