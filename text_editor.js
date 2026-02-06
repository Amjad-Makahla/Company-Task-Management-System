document.addEventListener("DOMContentLoaded", function () {
    tinymce.init({
      selector: '.tinymce-editor',
      plugins: 'link image code table media fullscreen',
      toolbar: 'undo redo | formatselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | blockquote | link image media table | forecolor backcolor | fullscreen | code',
      license_key: 'gpl',
      menubar: false,
      setup: function (editor) {
        editor.on('keyup change', function () {
          console.log("Editor content changed:", editor.getContent());
        });
      }
    });
  });
  