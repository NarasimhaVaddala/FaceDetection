import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';

import {
  Face,
  
  FaceDetectionOptions
} from 'react-native-vision-camera-face-detector'

export default function App() {
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const frameCountRef = useRef(0); // Track frame count using ref
  const [frameCount, setFrameCount] = useState(0); // To display frame count in UI



  const faceDetectionOptions = useRef<FaceDetectionOptions>( {
    // detection options
  } ).current



  function handleFacesDetection(
    faces,
    frame
  ) { 
    console.log(
      'faces', faces.length,
      'frame', frame.toString()
    )
  }


  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // Frame processor function, decorated with 'worklet' for optimization
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'; // Mark this function as a worklet

    // console.log(frame.toString());
    

    // Update frame count using ref
    frameCountRef.current += 1;

    // Optionally log the frame count
    if (frameCountRef.current % 30 === 0) {
      console.log('Processing frame...', frameCountRef.current);
    }

  }, []); // Empty dependency array ensures it doesn't re-run unnecessarily

  // Update state for every 30th frame in the regular JavaScript thread
  useEffect(() => {
    if (frameCountRef.current % 30 === 0) {
      setFrameCount(frameCountRef.current); // Update React state outside of the worklet
    }
  }, [frameCountRef.current]); // Trigger this effect when the ref changes

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'white' }}>Camera permission denied. Please enable it in settings.</Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.centered}>
        <Text>No Camera Device Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor} // Attach the frame processor to the camera
        faceDetectionCallback={ handleFacesDetection }
        faceDetectionOptions={ faceDetectionOptions }
      />
      <View style={styles.overlay}>
        <Text style={styles.frameCountText}>Frame Count: {frameCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 5,
  },
  frameCountText: {
    color: 'white',
    fontSize: 18,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
