# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - heading "NotesApp" [level=1] [ref=e6]
    - textbox "Search notes..." [ref=e8]
    - button "Add Note" [ref=e9] [cursor=pointer]
  - generic [ref=e11]: No notes found
  - paragraph [ref=e13]: Select a note to view or create a new one
  - generic [ref=e15]:
    - generic [ref=e16]:
      - heading "Add New Note" [level=2] [ref=e17]
      - button "Close" [ref=e18] [cursor=pointer]:
        - img [ref=e19]
    - generic [ref=e21]:
      - generic [ref=e22]:
        - generic [ref=e23]: Title
        - textbox "Title" [ref=e24]:
          - /placeholder: Enter note title
      - generic [ref=e25]:
        - generic [ref=e26]: Body
        - textbox "Body" [ref=e27]:
          - /placeholder: Enter note content
        - generic [ref=e28]: 0/500 characters
      - generic [ref=e29]:
        - generic [ref=e30]: Tags
        - textbox "Tags" [ref=e31]:
          - /placeholder: Enter tags separated by commas
      - generic [ref=e32]:
        - generic [ref=e33]: Attachments
        - button "Attachments" [ref=e34]
    - heading "Hello" [level=1] [ref=e35]
    - heading "Helo againand" [level=2] [ref=e36]
    - generic [ref=e37]:
      - button "Cancel" [ref=e38] [cursor=pointer]
      - button "Save Note" [active] [ref=e39] [cursor=pointer]
```