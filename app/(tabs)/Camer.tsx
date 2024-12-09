import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import {
  Canvas,
  Rect,
  Skia,
  Group,
} from "@shopify/react-native-skia";
import { useSharedValue, Worklets } from "react-native-worklets-core";

export default function App() {
  const device = useCameraDevice("front");
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
      setHasPermission(permission === "granted");
    };
    getPermissions();
  }, []);

  // createRunOnJS to trigger React state updates from worklets
  const runOnJSUpdateFaces = Worklets.createRunOnJS((faces) => {
    setDetectedFaces(faces); // Update React state when new faces are detected
  });

  // Frame processor to process camera frames and detect faces
  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";

    try {
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
        // console.log(plainFaces);
        

        // Trigger React state update using runOnJS
        runOnJSUpdateFaces(plainFaces);
      }
    } catch (error) {
      console.error("Error in frame processor:", error);
    }
  }, []);

  useEffect(() => {
    // Optionally log detected faces
    // console.log(detectedFaces , "in useeffect");
  }, [detectedFaces]);

  const renderSkia = detectedFaces.map((face, index) => {
    const { x, y, width, height } = face?.bounds || {};

    
    if (!x || !y || !width || !height) return null;
  
    // Adjust the bounding box to better cover the face by expanding it
    const padding = 0.2; // Increase padding to make sure the face is fully covered
    const adjustedWidth = width * (1.2 + padding);
    const adjustedHeight = height * (1.2 + padding);
  
    // Adjust the position to ensure the bounding box remains centered on the face
    const adjustedX = x - (adjustedWidth - width+10) ;
    const adjustedY = y - (adjustedHeight - height+20);
  
    return (
      <Group style="stroke" strokeWidth={10} key={index}>
        <Rect
          x={adjustedX}
          y={adjustedY}
          width={adjustedWidth}
          height={adjustedHeight}
          color="red"
          strokeWidth={5}
          antiAlias={true}
        />
      </Group>
    );
  });
  
  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "white" }}>
          Camera permission denied. Please enable it in settings.
        </Text>
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

      {detectedFaces.length > 0 && (
        <Canvas style={StyleSheet.absoluteFillObject}>
          {/* Render the outlined rectangle around detected faces */}
          {renderSkia}
        </Canvas>
      )}

      <View style={styles.overlay}>
        <Text style={styles.text}>Detected Faces: {detectedFaces.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  overlay: {
    position: "absolute",
    top: 50,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  text: {
    color: "white",
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
});
