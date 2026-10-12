//! The value domains of the contract's numbers and local names. Each domain is one field
//! type, and `new` is its only door: constructors, struct literals and every serde
//! `Deserializer` reach a value through it, so a value out of domain cannot exist.
//!
//! Each type writes and reads exactly the leaf of its inner type (`Int32`, `Int64`,
//! `String`), so the bytes are the plain leaf's. The reference's unsigned leaves are absent
//! from the TypeScript and Python packages, which is why the bound is a checked type here
//! and a refusal golden there.

use std::fmt;

use serde::{Deserialize, Deserializer, Serialize, Serializer, de};

/// A value was outside its domain. Names the domain and its bound, never the value.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DomainError {
    domain: &'static str,
    bound: &'static str,
}

impl DomainError {
    const fn new(domain: &'static str, bound: &'static str) -> Self {
        Self { domain, bound }
    }

    /// The type that refused.
    pub fn domain(&self) -> &'static str {
        self.domain
    }

    /// The bound that was not met.
    pub fn bound(&self) -> &'static str {
        self.bound
    }
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} must be {}", self.domain, self.bound)
    }
}

impl std::error::Error for DomainError {}

/// A result's position in its invocation's answers, counting from 1. `new` is the only door:
///
/// ```
/// use thing_contract::Seq;
/// assert!(Seq::new(1).is_ok());
/// ```
///
/// ```compile_fail,E0423
/// use thing_contract::Seq;
/// let _ = Seq(0);
/// ```
///
/// ```compile_fail,E0616
/// use thing_contract::Seq;
/// let mut seq = Seq::FIRST;
/// seq.0 = 0;
/// ```
///
/// ```compile_fail,E0599
/// use thing_contract::Seq;
/// let _ = Seq::default();
/// ```
///
/// ```compile_fail,E0277
/// use thing_contract::Seq;
/// let _ = Seq::from(0);
/// ```
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Seq(i32);

impl Seq {
    pub const FIRST: Seq = Seq(1);

    pub fn new(value: i32) -> Result<Self, DomainError> {
        if value >= 1 { Ok(Self(value)) } else { Err(DomainError::new("Seq", "at least 1")) }
    }

    pub fn get(self) -> i32 {
        self.0
    }

    /// The following position; stays at `i32::MAX` rather than leaving the domain.
    pub fn next(self) -> Seq {
        Seq(self.0.saturating_add(1))
    }
}

/// A document or source version, never negative. `new` is the only door:
///
/// ```
/// use thing_contract::Version;
/// assert!(Version::new(0).is_ok());
/// ```
///
/// ```compile_fail,E0423
/// use thing_contract::Version;
/// let _ = Version(-1);
/// ```
///
/// ```compile_fail,E0599
/// use thing_contract::Version;
/// let _ = Version::default();
/// ```
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Version(i64);

impl Version {
    pub fn new(value: i64) -> Result<Self, DomainError> {
        if value >= 0 { Ok(Self(value)) } else { Err(DomainError::new("Version", "at least 0")) }
    }

    pub fn get(self) -> i64 {
        self.0
    }
}

/// A count, an extent or an index, never negative. `new` is the only door:
///
/// ```
/// use thing_contract::Count;
/// assert!(Count::new(0).is_ok());
/// ```
///
/// ```compile_fail,E0423
/// use thing_contract::Count;
/// let _ = Count(-1);
/// ```
///
/// ```compile_fail,E0277
/// use thing_contract::Count;
/// let _: Count = (-1).into();
/// ```
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Count(i32);

impl Count {
    pub fn new(value: i32) -> Result<Self, DomainError> {
        if value >= 0 { Ok(Self(value)) } else { Err(DomainError::new("Count", "at least 0")) }
    }

    pub fn get(self) -> i32 {
        self.0
    }
}

/// A name the contract joins into a record key: non-empty, no `.`. `new` is the only door:
///
/// ```
/// use thing_contract::Segment;
/// assert!(Segment::new("main").is_ok());
/// ```
///
/// ```compile_fail,E0423
/// use thing_contract::Segment;
/// let _ = Segment(String::from("a.b"));
/// ```
///
/// ```compile_fail,E0277
/// use thing_contract::Segment;
/// let _: Segment = "a.b".into();
/// ```
#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Segment(String);

impl Segment {
    pub fn new(value: impl Into<String>) -> Result<Self, DomainError> {
        let value = value.into();
        if value.is_empty() {
            Err(DomainError::new("Segment", "non-empty"))
        } else if value.contains('.') {
            Err(DomainError::new("Segment", "free of '.'"))
        } else {
            Ok(Self(value))
        }
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

macro_rules! leaf_serde {
    ($name:ident, $inner:ty, $serialize:ident) => {
        impl Serialize for $name {
            fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                serializer.$serialize(self.0)
            }
        }

        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
                Self::new(<$inner>::deserialize(deserializer)?).map_err(de::Error::custom)
            }
        }
    };
}

leaf_serde!(Seq, i32, serialize_i32);
leaf_serde!(Version, i64, serialize_i64);
leaf_serde!(Count, i32, serialize_i32);

impl Serialize for Segment {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for Segment {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Self::new(String::deserialize(deserializer)?).map_err(de::Error::custom)
    }
}
