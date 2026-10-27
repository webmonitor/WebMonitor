"""
密码策略：唯一的长度/编码校验实现。

bcrypt 只接受最多 72 字节的输入，超出部分在旧实现里被静默截断，等于悄悄
改掉了用户输入的密码。这里改为显式拒绝，调用方（Schema、引导流程）各自把
错误转成 422 或启动失败。
"""

PASSWORD_MIN_LENGTH = 6
PASSWORD_MAX_BYTES = 72


def validate_password(password: str) -> str:
    """校验密码并原样返回；不合法时抛 ValueError。"""
    if not isinstance(password, str) or len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"密码至少需要 {PASSWORD_MIN_LENGTH} 个字符")
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise ValueError(f"密码不能超过 {PASSWORD_MAX_BYTES} 个字节（UTF-8 编码）")
    return password
