/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shims for Framer's Property Controls API to provide seamless execution in pure React environments.
export const addPropertyControls = (component: any, controls: any) => {
  component.propertyControls = controls;
};

export enum ControlType {
  Boolean = "boolean",
  Number = "number",
  String = "string",
  Color = "color",
  Enum = "enum",
  Object = "object",
  Image = "image",
}
