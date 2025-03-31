/**
 * Type definitions for Slack Block Kit components
 */
export declare namespace SlackBlocks {
    interface PlainTextObject {
        type: "plain_text";
        text: string;
        emoji?: boolean;
    }
    interface MrkdwnTextObject {
        type: "mrkdwn";
        text: string;
        verbatim?: boolean;
    }
    type TextObject = PlainTextObject | MrkdwnTextObject;
    interface ButtonElement {
        type: "button";
        text: PlainTextObject;
        action_id?: string;
        url?: string;
        value?: string;
        style?: "primary" | "danger";
    }
    interface ImageElement {
        type: "image";
        image_url: string;
        alt_text: string;
    }
    interface HeaderBlock {
        type: "header";
        text: PlainTextObject;
        block_id?: string;
    }
    interface SectionBlock {
        type: "section";
        text: TextObject;
        block_id?: string;
        fields?: TextObject[];
        accessory?: ButtonElement | ImageElement;
    }
    interface DividerBlock {
        type: "divider";
        block_id?: string;
    }
    interface ContextBlock {
        type: "context";
        elements: (TextObject | ImageElement)[];
        block_id?: string;
    }
    interface ActionsBlock {
        type: "actions";
        elements: ButtonElement[];
        block_id?: string;
    }
    type Block = HeaderBlock | SectionBlock | DividerBlock | ContextBlock | ActionsBlock;
}
