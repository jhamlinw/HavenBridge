using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HavenBridge.Api.Models;

[Table("ROLES")]
public class Role
{
    [Key]
    [Column("role_id")]
    public int RoleId { get; set; }

    [Column("description")]
    [MaxLength(100)]
    public string Description { get; set; } = string.Empty;

    public ICollection<User> Users { get; set; } = [];
}
