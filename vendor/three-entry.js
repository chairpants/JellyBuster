// What goes in vendor/three.js: three.js and the add-ons the game uses, as one plain script, because file:// can't
// load local files as ES modules. `npm run vendor` rebuilds it, and only needs running to change three.js's version.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
Object.assign(window, { THREE, mergeGeometries, UnrealBloomPass, ShaderPass, OutputPass });
