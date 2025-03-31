/**
 * Type definitions for Slack Block Kit components
 */
export namespace SlackBlocks {
    // Text objects
    export interface PlainTextObject {
      type: "plain_text";
      text: string;
      emoji?: boolean;
    }
  
    export interface MrkdwnTextObject {
      type: "mrkdwn";
      text: string;
      verbatim?: boolean;
    }
  
    export type TextObject = PlainTextObject | MrkdwnTextObject;
  
    // Block elements
    export interface ButtonElement {
      type: "button";
      text: PlainTextObject;
      action_id?: string;
      url?: string;
      value?: string;
      style?: "primary" | "danger";
    }
  
    export interface ImageElement {
      type: "image";
      image_url: string;
      alt_text: string;
    }
  
    // Blocks
    export interface HeaderBlock {
      type: "header";
      text: PlainTextObject;
      block_id?: string;
    }
  
    export interface SectionBlock {
      type: "section";
      text: TextObject;
      block_id?: string;
      fields?: TextObject[];
      accessory?: ButtonElement | ImageElement;
    }
  
    export interface DividerBlock {
      type: "divider";
      block_id?: string;
    }
  
    export interface ContextBlock {
      type: "context";
      elements: (TextObject | ImageElement)[];
      block_id?: string;
    }
  
    export interface ActionsBlock {
      type: "actions";
      elements: ButtonElement[];
      block_id?: string;
    }
  
    // Block types union
    export type Block = 
      | HeaderBlock 
      | SectionBlock 
      | DividerBlock 
      | ContextBlock 
      | ActionsBlock;
  }