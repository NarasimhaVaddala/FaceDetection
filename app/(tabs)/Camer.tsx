import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { Canvas, Rect, Paint, Skia } from '@shopify/react-native-skia';
import { useSharedValue, Worklets } from 'react-native-worklets-core';

export default function App() {
  const device = useCameraDevice('front');
  const [hasPermission, setHasPermission] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);

  // Initialize face detector
  const facedetector = useFaceDetector();

  // Shared value to store faces data (from worklets package)
  const facesShared = useSharedValue([]);

  // Handle permissions
  useEffect(() => {
    const getPermissions = async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');
    };
    getPermissions();
  }, []);

  // createRunOnJS to trigger React state updates from worklets
  const runOnJSUpdateFaces = Worklets.createRunOnJS((faces) => {
    // console.log(faces);
    
    setDetectedFaces(faces); // Update React state when new faces are detected
  });


  // Frame processor to process camera frames and detect faces
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';


      try {

        const throttleRate = 10;

        if (frame.timestamp % throttleRate === 0) {

          
          const detectedFaces = facedetector.detectFaces(frame);

          if (detectedFaces.length) {
                 // Map detected faces to a plain array of bounds and angles
          const plainFaces = detectedFaces.map((face) => ({
            bounds: face.bounds,
            pitchAngle: face.pitchAngle,
            rollAngle: face.rollAngle,
            yawAngle: face.yawAngle,
          }));


          facesShared.value = plainFaces;
  
          // Trigger React state update using runOnJS
          runOnJSUpdateFaces(facesShared.value);
  
         
         
          }

     

        }

       
      } catch (error) {
        console.error('Error in frame processor:', error);
      }
    }
  , []);


  useEffect(()=>{
      // console.log(detectedFaces , "in useeffect");
      
  },[detectedFaces])




  const renderSkia =  Object.values(detectedFaces).map((face, index) => {


    console.log(detectedFaces , "in skia");
    
  
    // Create a Skia rect using the face bounds
    // const rect = Skia.XYWHRect(face.bounds.x, origin.y, size.width, size.height);
  
    // // Prepare the paint style
    // const paint = Skia.Paint();
    // paint.setStyle('stroke'); // Ensure we use stroke
    // paint.setStrokeWidth(3); // Line width
    // paint.setColor(Skia.Color('red')); // Red color for bounding box
  
    // return <Rect key={index} rect={rect} paint={paint} />;
  });
  
  

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'white' }}>Camera permission denied. Please enable it in settings.</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text>No Camera Device Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      <Canvas style={StyleSheet.absoluteFillObject}>
        {renderSkia}
      </Canvas>
      <View style={styles.overlay}>
        <Text style={styles.text}>Detected Faces: {detectedFaces.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  text: {
    color: 'white',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
});
