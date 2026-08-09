import React, { useEffect, useRef } from 'react';
import { Button, Modal } from 'antd';

export default function RecitationResetDialog({ open, onCancel, onConfirm, triggerRef }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => cancelRef.current?.focus());
  }, [open]);

  const cancel = () => {
    onCancel();
    window.requestAnimationFrame(() => triggerRef?.current?.focus());
  };

  return (
    <Modal
      open={open}
      title="重新开始背诵？"
      onCancel={cancel}
      footer={[
        <Button ref={cancelRef} key="keep" onClick={cancel}>继续保留</Button>,
        <Button danger type="primary" key="reset" onClick={onConfirm}>清空并重新开始</Button>,
      ]}
      focusable={{ focusTriggerAfterClose: false }}
      destroyOnHidden
    >
      <p>已完成的口诀会全部清空，并从“一一得一”重新开始。</p>
    </Modal>
  );
}
